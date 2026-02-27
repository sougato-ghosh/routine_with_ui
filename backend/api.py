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
from collections import defaultdict
from bs4 import BeautifulSoup
import json
from sqlalchemy.orm import Session
from database import SessionLocal, init_db, get_db
from models import (
    Teacher, Room, Class, Subject, Curriculum,
    TeacherUnavailability, TeacherPreference, SubjectOfAllSemester, Setting, Term,
    Schedule, ScheduleAssignment, ScheduleHomeRoom
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "output")

# Initialize DB on startup
init_db()

def ensure_default_settings():
    db = SessionLocal()
    try:
        defaults = {
            "days_num": "5",
            "periods_num": "9",
            "break_period": "6",
            "theory_allowed_periods": "1,2,3,4,5",
            "lab_allowed_periods": "1,4,7",
            "day_labels": "Sa,Su,Mo,Tu,We",
            "period_labels": "1st,2nd,3rd,4th,5th,6th,7th,8th,9th",
            "period_times": "8:00-8:50,9:00-9:50,10:00-10:50,11:00-11:50,12:00-12:50,1:00-1:30,2:00-2:50,3:00-3:50,4:00-4:50",
            "break_time_label": "1:30 - 2:00",
            "sections": "A,B,C",
            "seniority_levels": "Lecturer,Assistant Professor,Associate Professor,Professor",
            "departments": "ME,CHEM,CHE,EEE,CSE,CE,IPE,MME,WRE,Math,Physics,Hum"
        }
        for k, v in defaults.items():
            exists = db.query(Setting).filter(Setting.key == k).first()
            if not exists:
                db.add(Setting(key=k, value=v, user_id="default_user"))
        db.commit()
    finally:
        db.close()

ensure_default_settings()

MODEL_MAP = {
    "teachers.csv": Teacher,
    "rooms.csv": Room,
    "classes.csv": Class,
    "subjects.csv": Subject,
    "curriculum.csv": Curriculum,
    "teacher_unavailability.csv": TeacherUnavailability,
    "teacher_preferences.csv": TeacherPreference,
    "subjects_of_all_semester.csv": SubjectOfAllSemester,
    "terms.csv": Term
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
def get_overview(db: Session = Depends(get_db)):
    return {
        "teachers": db.query(Teacher).count(),
        "classes": db.query(Class).count(),
        "rooms": db.query(Room).count(),
        "load": db.query(Curriculum).count(),
    }

@app.get("/data/{filename}")
def get_data(filename: str, db: Session = Depends(get_db)):
    if filename not in MODEL_MAP:
        raise HTTPException(status_code=403, detail="Access denied")
    model = MODEL_MAP[filename]
    items = db.query(model).all()
    return [to_dict(item) for item in items]

@app.post("/data/{filename}")
def update_data(filename: str, data: List[Dict[Any, Any]], db: Session = Depends(get_db)):
    if filename not in MODEL_MAP:
        raise HTTPException(status_code=403, detail="Access denied")
    model = MODEL_MAP[filename]

    # Simple strategy: clear and replace
    db.query(model).delete()

    # If terms are updated, also clear curriculum
    if filename == "terms.csv":
        db.query(Curriculum).delete()

    for item in data:
        valid_data = clean_data(item, model)
        db.add(model(**valid_data, user_id="default_user"))
    db.commit()
    return {"status": "success"}

@app.get("/export/{filename}")
def export_data(filename: str, db: Session = Depends(get_db)):
    if filename not in MODEL_MAP:
        raise HTTPException(status_code=403, detail="Access denied")
    model = MODEL_MAP[filename]
    items = db.query(model).all()

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
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/import/{filename}")
async def import_data(filename: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if filename not in MODEL_MAP:
        raise HTTPException(status_code=403, detail="Access denied")
    model = MODEL_MAP[filename]

    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    # Clear and replace
    db.query(model).delete()

    # If curriculum is imported, filter by active terms
    if filename == "curriculum.csv":
        active_terms = db.query(Term).filter(Term.is_active == True).all()
        active_codes = [t.name.replace('-', '') for t in active_terms]

        def is_active(row):
            cid = str(row.get('class_id', ''))
            return any(cid.startswith(code) for code in active_codes)

        mask = df.apply(is_active, axis=1)
        df = df[mask]

    for _, row in df.iterrows():
        valid_data = clean_data(row.to_dict(), model)
        db.add(model(**valid_data, user_id="default_user"))
    db.commit()
    return {"status": "success"}

@app.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(Setting).all()
    return {s.key: s.value for s in settings if s.key != 'footer_right_text'}

@app.post("/settings")
def update_settings(data: Dict[str, str], db: Session = Depends(get_db)):
    for k, v in data.items():
        setting = db.query(Setting).filter(Setting.key == k).first()
        if setting:
            setting.value = v
        else:
            db.add(Setting(key=k, value=v, user_id="default_user"))
    db.commit()
    return {"status": "success"}

@app.get("/validate")
def validate_data():
    issues = data_validator.validate_data()
    return issues

@app.post("/run-scheduler")
def run_scheduler():
    data_validator.validate_data()
    res = main.run()

    return {
        "result": res
    }

@app.get("/schedules")
def list_schedules(db: Session = Depends(get_db)):
    schedules = db.query(Schedule).order_by(Schedule.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "created_at": s.created_at,
            "is_active": s.is_active
        } for s in schedules
    ]

@app.get("/schedules/{schedule_id}/items")
def get_schedule_items(schedule_id: int, db: Session = Depends(get_db)):
    assignments = db.query(ScheduleAssignment).filter(ScheduleAssignment.schedule_id == schedule_id).all()

    classes = sorted(list(set((a.class_id, a.class_name) for a in assignments)))
    teachers = sorted(list(set((a.teacher_id, a.teacher_name) for a in assignments)))

    return {
        "classes": [{"id": c[0], "name": c[1]} for c in classes],
        "teachers": [{"id": t[0], "name": t[1]} for t in teachers]
    }

@app.get("/schedules/{schedule_id}/view")
def view_schedule(schedule_id: int, type: str, id: str, db: Session = Depends(get_db)):
    # type can be 'class' or 'teacher'
    # id is the class_id or teacher_id

    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if type == 'class':
        assignments = db.query(ScheduleAssignment).filter(
            ScheduleAssignment.schedule_id == schedule_id,
            ScheduleAssignment.class_id == id
        ).all()
        title = next((a.class_name for a in assignments), id)
        home_room_rec = db.query(ScheduleHomeRoom).filter(
            ScheduleHomeRoom.schedule_id == schedule_id,
            ScheduleHomeRoom.class_id == id
        ).first()
        home_room = f"R#{home_room_rec.room_id}" if home_room_rec else ""
    else:
        assignments = db.query(ScheduleAssignment).filter(
            ScheduleAssignment.schedule_id == schedule_id,
            ScheduleAssignment.teacher_id == id
        ).all()
        title = next((a.teacher_name for a in assignments), id)
        home_room = ""

    # Load settings for grid construction
    settings_recs = db.query(Setting).all()
    settings = {s.key: s.value for s in settings_recs}

    days_num = int(settings.get('days_num', 5))
    periods_num = int(settings.get('periods_num', 9))
    break_period = int(settings.get('break_period', 6))

    day_labels = settings.get('day_labels', '').split(',')
    period_labels = settings.get('period_labels', '').split(',')
    period_times = settings.get('period_times', '').split(',')

    # Construct the table
    rows = []

    # Header row
    header_row = [{"text": "", "is_header": True, "colspan": 1, "rowspan": 1}]
    for p in range(1, periods_num + 1):
        p_idx = p - 1
        label = period_labels[p_idx].strip() if p_idx < len(period_labels) else f"{p}th"
        time_val = period_times[p_idx].strip() if p_idx < len(period_times) else ""

        header_row.append({
            "text": f"{label}\n{time_val}",
            "is_header": True,
            "colspan": 1,
            "rowspan": 1
        })

        if p == break_period:
            header_row.append({
                "text": f"Break\n{settings.get('break_time_label', '')}",
                "is_header": True,
                "colspan": 1,
                "rowspan": days_num + 1,
                "classes": ["break-cell"]
            })
    rows.append(header_row)

    # Data rows
    grid = defaultdict(dict)
    for a in assignments:
        grid[a.day][a.period] = a

    for d in range(1, days_num + 1):
        d_idx = d - 1
        day_label = day_labels[d_idx].strip() if d_idx < len(day_labels) else str(d)
        row = [{"text": day_label, "is_header": True, "colspan": 1, "rowspan": 1, "classes": ["day-label"]}]

        skip = 0
        for p in range(1, periods_num + 1):
            if skip > 0:
                skip -= 1
                continue

            assign = grid[d].get(p)
            if assign:
                cell = {
                    "text": "",
                    "is_header": False,
                    "colspan": assign.duration,
                    "rowspan": 1,
                    "content": [
                        {"type": "subject", "text": assign.subject_id},
                        {"type": "teacher" if type == 'class' else "class", "text": assign.teacher_id if type == 'class' else assign.class_id}
                    ]
                }
                if assign.is_lab:
                    cell["content"].append({"type": "room", "text": f"{assign.room_name} #{assign.room_id}"})
                elif type == 'teacher':
                    cell["content"].append({"type": "room", "text": assign.room_id})

                row.append(cell)
                skip = assign.duration - 1
            else:
                row.append({"text": "", "is_header": False, "colspan": 1, "rowspan": 1})
        rows.append(row)

    return {
        "metadata": {
            "header_title": f"Routine (Term: {settings.get('session_name', 'N/A')})",
            "class_title": title,
            "home_room": home_room,
            "footer_left": f"Timetable generated: {schedule.created_at[:10]}",
            "footer_right": "Cadence"
        },
        "table": rows
    }

@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    db.query(ScheduleAssignment).filter(ScheduleAssignment.schedule_id == schedule_id).delete()
    db.query(ScheduleHomeRoom).filter(ScheduleHomeRoom.schedule_id == schedule_id).delete()
    db.query(Schedule).filter(Schedule.id == schedule_id).delete()
    db.commit()
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
