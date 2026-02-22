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
from bs4 import BeautifulSoup
import json
from sqlalchemy.orm import Session
from database import SessionLocal, init_db, get_db
from models import (
    Teacher, Room, Class, Subject, Timeslot, Curriculum,
    TeacherUnavailability, TeacherPreference, SubjectOfAllSemester, Setting, Term
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

MODEL_MAP = {
    "teachers.csv": Teacher,
    "rooms.csv": Room,
    "classes.csv": Class,
    "subjects.csv": Subject,
    "timeslots.csv": Timeslot,
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
    for item in data:
        db.add(model(**item, user_id="default_user"))
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
    for _, row in df.iterrows():
        # Clean row data (remove NaNs)
        item_data = row.to_dict()
        item_data = {k: (None if pd.isna(v) else v) for k, v in item_data.items() if k in model.__table__.columns}
        db.add(model(**item_data, user_id="default_user"))
    db.commit()
    return {"status": "success"}

@app.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(Setting).all()
    return {s.key: s.value for s in settings}

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
def list_schedules():
    if not os.path.exists(OUT_DIR):
        return []
    return sorted([f for f in os.listdir(OUT_DIR) if f.endswith(".html")])

@app.get("/schedules/{filename}")
def get_schedule(filename: str):
    if not filename.endswith(".html") or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=403, detail="Access denied")

    path = os.path.join(OUT_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Schedule not found")

    with open(path, "r", encoding="utf-8") as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, "html.parser")

    header_title = soup.find(class_="header-title").get_text() if soup.find(class_="header-title") else ""
    class_title = soup.find(class_="class-title").get_text() if soup.find(class_="class-title") else ""
    home_room = soup.find(class_="home-room").get_text() if soup.find(class_="home-room") else ""

    table = soup.find("table", class_="timetable")
    if not table:
         raise HTTPException(status_code=500, detail="Invalid schedule format")

    rows = []
    tr_elements = table.find_all("tr")
    occupied = {}

    for r_idx, tr in enumerate(tr_elements):
        row = []
        cells = tr.find_all(["th", "td"])
        cell_idx = 0
        col_idx = 0

        while True:
            if (r_idx, col_idx) in occupied:
                occ_cell = occupied[(r_idx, col_idx)]
                placeholder = {**occ_cell, "rowspan": 1}
                row.append(placeholder)
                col_idx += placeholder["colspan"]
                continue

            if cell_idx >= len(cells):
                break

            cell = cells[cell_idx]
            cell_idx += 1

            colspan = int(cell.get("colspan", 1))
            rowspan = int(cell.get("rowspan", 1))

            cell_data = {
                "text": cell.get_text(strip=True),
                "is_header": cell.name == "th",
                "colspan": colspan,
                "rowspan": rowspan,
                "classes": cell.get("class", []),
                "content": []
            }

            if not cell_data["is_header"]:
                subj = cell.find(class_="subject-id")
                teacher = cell.find(class_="teacher-id")
                room = cell.find(class_="room-info")

                if subj:
                    cell_data["content"].append({"type": "subject", "text": subj.get_text(strip=True)})
                if teacher:
                    cell_data["content"].append({"type": "teacher", "text": teacher.get_text(strip=True)})
                if room:
                    cell_data["content"].append({"type": "room", "text": room.get_text(strip=True)})

            if rowspan > 1:
                for r_offset in range(1, rowspan):
                    occupied[(r_idx + r_offset, col_idx)] = cell_data

            current_cell_data = cell_data
            if rowspan > 1:
                current_cell_data = {**cell_data, "rowspan": 1}

            row.append(current_cell_data)
            col_idx += colspan

        rows.append(row)

    footer_left = soup.find(class_="footer-left").get_text() if soup.find(class_="footer-left") else ""
    footer_right = soup.find(class_="footer-right").get_text() if soup.find(class_="footer-right") else ""

    return {
        "metadata": {
            "header_title": header_title,
            "class_title": class_title,
            "home_room": home_room,
            "footer_left": footer_left,
            "footer_right": footer_right
        },
        "table": rows
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
