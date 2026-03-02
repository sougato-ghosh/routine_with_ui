from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import os
import io
import csv
import main
import data_validator
from typing import List, Dict, Any
import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import SessionLocal, init_db, get_db
from models import (
    User, Teacher, Room, Class, Subject, Curriculum,
    TeacherUnavailability, TeacherPreference, SubjectOfAllSemester, Setting, Term,
    Schedule, ScheduleAssignment
)
from auth_utils import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token
)
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

class UserAuth(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class RefreshRequest(BaseModel):
    refresh_token: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB on startup
init_db()

DEFAULT_SETTINGS = {
    "days_num": "5",
    "periods_num": "9",
    "show_break": "true",
    "break_period": "6",
    "theory_allowed_periods": "1,2,3,4,5",
    "lab_allowed_periods": "1,4,7",
    "day_labels": "Sa,Su,Mo,Tu,We",
    "period_labels": "1st,2nd,3rd,4th,5th,6th,7th,8th,9th",
    "period_times": "8:00-8:50,9:00-9:50,10:00-10:50,11:00-11:50,12:00-12:50,1:00-1:30,2:00-2:50,3:00-3:50,4:00-4:50",
    "break_time_label": "1:30 - 2:00",
    "session_name": "January 2025",
    "sections": "A,B,C",
    "seniority_levels": "Lecturer,Assistant Professor,Associate Professor,Professor",
    "departments": "ME,CHEM,CHE,EEE,CSE,CE,IPE,MME,WRE,Math,Physics,Hum"
}

def ensure_default_settings():
    db = SessionLocal()
    try:
        for k, v in DEFAULT_SETTINGS.items():
            exists = db.query(Setting).filter(Setting.key == k, Setting.user_id == "default_user").first()
            if not exists:
                db.add(Setting(key=k, value=v, user_id="default_user"))
        db.commit()
    finally:
        db.close()

ensure_default_settings()

@app.get("/")
def health_check(db: Session = Depends(get_db)):
    user_count = db.query(User).count()
    return {
        "status": "success",
        "message": f"Yes, server is running, there is {user_count} number of user currently registered",
        "user_count": user_count
    }

@app.post("/register", response_model=Token)
def register(user_data: UserAuth, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = get_password_hash(user_data.password)
    new_user = User(username=user_data.username, hashed_password=hashed_password)
    db.add(new_user)
    db.flush()

    # Copy default settings for the new user
    for k, v in DEFAULT_SETTINGS.items():
        db.add(Setting(key=k, value=v, user_id=new_user.username))

    db.commit()

    access_token = create_access_token(data={"sub": new_user.username})
    refresh_token = create_refresh_token(data={"sub": new_user.username})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
def login(user_data: UserAuth, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@app.post("/refresh", response_model=Token)
def refresh(refresh_data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(refresh_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

MODEL_MAP = {
    "teachers": Teacher,
    "rooms": Room,
    "classes": Class,
    "subjects": Subject,
    "curriculum": Curriculum,
    "teacher_unavailability": TeacherUnavailability,
    "teacher_preferences": TeacherPreference,
    "subjects_of_all_semester": SubjectOfAllSemester,
    "terms": Term,
    "schedules": Schedule,
    "schedule_assignments": ScheduleAssignment,
    "settings": Setting
}

def to_dict(obj):
    d = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    if 'id' in d: del d['id']
    if 'user_id' in d: del d['user_id']
    return d

def clean_data(item, model):
    """
    Filters dictionary keys to match model columns and removes reserved fields like 'id' and 'user_id'
    to prevent conflicts during database insertion.
    """
    return {
        k: (None if pd.isna(v) else v) if isinstance(v, (float, int)) and pd.isna(v) else v
        for k, v in item.items()
        if k in model.__table__.columns and k not in ['id', 'user_id']
    }

@app.get("/overview")
def get_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {
        "teachers": db.query(Teacher).filter(Teacher.user_id == current_user.username).count(),
        "classes": db.query(Class).filter(Class.user_id == current_user.username).count(),
        "rooms": db.query(Room).filter(Room.user_id == current_user.username).count(),
        "load": db.query(Curriculum).filter(Curriculum.user_id == current_user.username).count(),
    }

@app.get("/data/{table_name}")
def get_data(table_name: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if table_name not in MODEL_MAP:
        raise HTTPException(status_code=403, detail="Access denied")
    model = MODEL_MAP[table_name]
    items = db.query(model).filter(model.user_id == current_user.username).all()
    return [to_dict(item) for item in items]

@app.post("/data/{table_name}")
def update_data(table_name: str, data: List[Dict[Any, Any]], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if table_name not in MODEL_MAP:
        raise HTTPException(status_code=403, detail="Access denied")
    model = MODEL_MAP[table_name]

    try:
        # Simple strategy: clear and replace for the current user
        db.query(model).filter(model.user_id == current_user.username).delete()

        # If terms are updated, also clear curriculum for the current user
        if table_name == "terms":
            db.query(Curriculum).filter(Curriculum.user_id == current_user.username).delete()

        for item in data:
            valid_data = clean_data(item, model)
            db.add(model(**valid_data, user_id=current_user.username))
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database integrity error: {str(e.orig)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    return {"status": "success"}

@app.get("/export/{table_name}")
def export_data(table_name: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if table_name not in MODEL_MAP:
        raise HTTPException(status_code=403, detail="Access denied")
    model = MODEL_MAP[table_name]
    items = db.query(model).filter(model.user_id == current_user.username).all()

    output = io.StringIO()
    if not items:
        # Return empty CSV with headers
        headers = [c.name for c in model.__table__.columns if c.name not in ['id', 'user_id']]
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
    else:
        dicts = [to_dict(item) for item in items]
        writer = csv.DictWriter(output, fieldnames=dicts[0].keys())
        writer.writeheader()
        writer.writerows(dicts)

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={table_name}.csv"}
    )

@app.post("/import/{table_name}")
async def import_data(table_name: str, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if table_name not in MODEL_MAP:
        raise HTTPException(status_code=403, detail="Access denied")
    model = MODEL_MAP[table_name]

    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    try:
        # Clear and replace for the current user
        if table_name == "schedules":
            # When schedules are replaced, we must also clear assignments due to FK
            db.query(ScheduleAssignment).filter(ScheduleAssignment.user_id == current_user.username).delete()
            db.query(Schedule).filter(Schedule.user_id == current_user.username).delete()
        else:
            db.query(model).filter(model.user_id == current_user.username).delete()

        # If curriculum is imported, filter by active terms for the current user
        if table_name == "curriculum":
            active_terms = db.query(Term).filter(Term.is_active == True, Term.user_id == current_user.username).all()
            active_codes = [t.name.replace('-', '') for t in active_terms]

            def is_active(row):
                cid = str(row.get('class_id', ''))
                return any(cid.startswith(code) for code in active_codes)

            mask = df.apply(is_active, axis=1)
            df = df[mask]

        for _, row in df.iterrows():
            valid_data = clean_data(row.to_dict(), model)
            db.add(model(**valid_data, user_id=current_user.username))
        db.commit()
    except IntegrityError as e:
        db.rollback()
        detail = str(e.orig)
        if "FOREIGN KEY constraint failed" in detail:
            if table_name == "schedule_assignments":
                detail = "Foreign key constraint failed. Please ensure the referenced Schedule ID exists before importing assignments."
        raise HTTPException(status_code=400, detail=f"Database integrity error: {detail}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    return {"status": "success"}

@app.get("/settings")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = db.query(Setting).filter(Setting.user_id == current_user.username).all()
    return {s.key: s.value for s in settings if s.key != 'footer_right_text'}

@app.post("/settings")
def update_settings(data: Dict[str, str], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for k, v in data.items():
        setting = db.query(Setting).filter(Setting.key == k, Setting.user_id == current_user.username).first()
        if setting:
            setting.value = v
        else:
            db.add(Setting(key=k, value=v, user_id=current_user.username))
    db.commit()
    return {"status": "success"}

@app.get("/validate")
def validate_data(current_user: User = Depends(get_current_user)):
    issues = data_validator.validate_data(user_id=current_user.username)
    return issues

@app.post("/run-scheduler")
def run_scheduler(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data_validator.validate_data(user_id=current_user.username)
    res = main.run(user_id=current_user.username)

    if res.get('success') and res.get('data'):
        data = res['data']
        # Create Schedule entry
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        schedule_name = data['settings_snapshot'].get('session_name', f"Schedule {now}")

        new_schedule = Schedule(
            user_id=current_user.username,
            name=schedule_name,
            created_at=now,
            settings_snapshot=json.dumps(data['settings_snapshot'])
        )
        db.add(new_schedule)
        db.flush() # Get ID

        # Create assignments
        for assign in data['assignments']:
            db.add(ScheduleAssignment(
                user_id=current_user.username,
                schedule_id=new_schedule.id,
                session_id=assign['session_id'],
                class_id=assign['class_id'],
                subject_id=assign['subject_id'],
                teacher_id=assign['teacher_id'],
                day=assign['day'],
                period=assign['period'],
                room_id=assign['room_id']
            ))

        # Save home room map in settings_snapshot or a separate place?
        # Let's update settings_snapshot with home_room_map
        full_snapshot = data['settings_snapshot']
        full_snapshot['home_room_map'] = data['home_room_map']
        new_schedule.settings_snapshot = json.dumps(full_snapshot)

        # Prune old schedules - keep only top 5 per user
        old_schedules = db.query(Schedule).filter(Schedule.user_id == current_user.username).order_by(Schedule.id.desc()).offset(5).all()
        for old in old_schedules:
            db.delete(old)

        db.commit()
        res['schedule_id'] = new_schedule.id

    return {
        "result": res
    }

@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id, Schedule.user_id == current_user.username).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    return {"status": "success"}

@app.delete("/schedules")
def delete_all_schedules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Explicitly delete assignments first, then schedules to handle any potential FK issues
        db.query(ScheduleAssignment).filter(ScheduleAssignment.user_id == current_user.username).delete()
        db.query(Schedule).filter(Schedule.user_id == current_user.username).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete all schedules: {str(e)}")
    return {"status": "success"}

@app.get("/schedules")
def list_schedules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schedules = db.query(Schedule).filter(Schedule.user_id == current_user.username).order_by(Schedule.id.desc()).all()
    return [{
        "id": s.id,
        "name": s.name,
        "created_at": s.created_at
    } for s in schedules]

@app.get("/schedules/{schedule_id}")
def get_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id, Schedule.user_id == current_user.username).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    assignments = db.query(ScheduleAssignment).filter(ScheduleAssignment.schedule_id == schedule_id, ScheduleAssignment.user_id == current_user.username).all()
    settings = json.loads(schedule.settings_snapshot)

    # We need to return a list of options (classes/teachers) for the frontend to choose from
    # Actually, the original API returned ONE routine at a time based on filename.
    # The frontend expects a 'table' and 'metadata'.
    # We should probably add a query param to filter by class or teacher.
    return {
        "id": schedule.id,
        "name": schedule.name,
        "created_at": schedule.created_at,
        "classes": sorted(list(set(a.class_id for a in assignments))),
        "teachers": sorted(list(set(a.teacher_id for a in assignments)))
    }

def format_class_name(class_id: str) -> str:
    if len(class_id) >= 3 and class_id[0].isdigit() and class_id[1].isdigit():
        level, term, sec = class_id[0], class_id[1], class_id[2:]
        return f"ME L-{level}/T-{term} (Sec {sec})"
    return f"ME {class_id}"

@app.get("/schedules/{schedule_id}/view")
def view_schedule(schedule_id: int, type: str, id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id, Schedule.user_id == current_user.username).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Get current session name from settings instead of snapshot
    curr_settings = db.query(Setting).filter(Setting.user_id == current_user.username).all()
    settings_dict = {s.key: s.value for s in curr_settings}
    header_title = settings_dict.get('session_name', schedule.name)

    settings = json.loads(schedule.settings_snapshot)
    home_room_map = settings.get('home_room_map', {})

    if type == 'class':
        assignments = db.query(ScheduleAssignment).filter(
            ScheduleAssignment.schedule_id == schedule_id,
            ScheduleAssignment.class_id == id,
            ScheduleAssignment.user_id == current_user.username
        ).all()
        class_info = db.query(Class).filter(Class.class_id == id, Class.user_id == current_user.username).first()

        # Fallback to L-T format if class name is missing
        if class_info and class_info.name:
            title = class_info.name
        else:
            if len(id) >= 2 and id[0].isdigit() and id[1].isdigit():
                title = f"{id[0]}-{id[1]}"
            else:
                title = id

        hr_id = home_room_map.get(id, "")
        hr_display = f"R#{hr_id}" if hr_id else ""
    elif type == 'teacher':
        assignments = db.query(ScheduleAssignment).filter(
            ScheduleAssignment.schedule_id == schedule_id,
            ScheduleAssignment.teacher_id == id,
            ScheduleAssignment.user_id == current_user.username
        ).all()
        teacher_info = db.query(Teacher).filter(Teacher.teacher_id == id, Teacher.user_id == current_user.username).first()
        title = f"{teacher_info.name if teacher_info else id} ({id})"
        hr_display = ""
    else:
        raise HTTPException(status_code=400, detail="Invalid type")

    # Build the grid (reusing logic from main.py's former create_output_tables)
    periods_num = int(settings.get('periods_num', 9))
    days_num = int(settings.get('days_num', 5))
    show_break = settings.get('show_break', 'true') == 'true'
    break_period = int(settings.get('break_period', 6))

    period_labels = settings.get('period_labels', "").split(',')
    period_times = settings.get('period_times', "").split(',')
    day_labels = settings.get('day_labels', "").split(',')

    # Prepare subjects data for duration
    subjects_db = db.query(Subject).filter(Subject.user_id == current_user.username).all()
    subject_durations = {(s.class_id[:2] if s.class_id else "", s.subject_id): s.duration for s in subjects_db}
    # Fallback for subjects without class prefix match
    subject_durations_fallback = {s.subject_id: s.duration for s in subjects_db}

    table = []
    # Header row
    header = [{"text": "", "is_header": True, "colspan": 1, "rowspan": 1, "classes": [], "content": []}]
    for p in range(1, periods_num + 1):
        label = period_labels[p-1].strip() if p-1 < len(period_labels) else f"{p}th"
        time_val = period_times[p-1].strip() if p-1 < len(period_times) else ""
        header.append({
            "text": f"{label} {time_val}",
            "is_header": True,
            "colspan": 1,
            "rowspan": 1,
            "classes": [],
            "content": []
        })
        if show_break and p == break_period:
            header.append({
                "text": f"Break {settings.get('break_time_label', '')}",
                "is_header": True,
                "colspan": 1,
                "rowspan": 1,
                "classes": ["break-cell"],
                "content": []
            })
    table.append(header)

    # Data rows
    grid = {} # (day, period) -> assignment
    for a in assignments:
        grid[(a.day, a.period)] = a

    for d in range(1, days_num + 1):
        row = []
        day_label = day_labels[d-1].strip() if d-1 < len(day_labels) else str(d)
        row.append({"text": day_label, "is_header": False, "colspan": 1, "rowspan": 1, "classes": ["day-label"], "content": []})

        covered_periods = set()
        for p in range(1, periods_num + 1):
            if p not in covered_periods:
                a = grid.get((d, p))
                if a:
                    lt_prefix = a.class_id[:2]
                    duration = subject_durations.get((lt_prefix, a.subject_id)) or subject_durations_fallback.get(a.subject_id, 1)

                    content = [
                        {"type": "subject", "text": a.subject_id},
                        {"type": "teacher", "text": a.teacher_id if type == 'class' else a.class_id}
                    ]
                    # If it's class view, show room. If teacher view, show room.
                    # In original: class view showed room if lab. teacher view showed room.
                    # Let's just always show room if available
                    if a.room_id:
                        content.append({"type": "room", "text": a.room_id})

                    row.append({
                        "text": "",
                        "is_header": False,
                        "colspan": duration,
                        "rowspan": 1,
                        "classes": [],
                        "content": content
                    })
                    for i in range(duration):
                        covered_periods.add(p + i)
                else:
                    row.append({
                        "text": "",
                        "is_header": False,
                        "colspan": 1,
                        "rowspan": 1,
                        "classes": [],
                        "content": []
                    })
                    covered_periods.add(p)

            if show_break and p == break_period:
                row.append({
                    "text": "",
                    "is_header": False,
                    "colspan": 1,
                    "rowspan": 1,
                    "classes": ["break-cell"],
                    "content": []
                })
        table.append(row)

    return {
        "metadata": {
            "header_title": header_title,
            "class_title": title,
            "home_room": hr_display,
            "footer_left": f"Generated: {schedule.created_at}",
            "footer_right": "Cadence"
        },
        "table": table
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
