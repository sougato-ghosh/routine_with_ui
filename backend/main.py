#!/usr/bin/env python3
import os
import re
import csv
from datetime import datetime
from collections import defaultdict, namedtuple
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional
import time
import pandas as pd
from ortools.sat.python import cp_model
from sqlalchemy.orm import Session
from database import SessionLocal
from models import (
    Teacher, Room, Class, Subject, Timeslot, Curriculum,
    TeacherUnavailability, TeacherPreference, Setting
)

# ------------------------------
# Paths
# ------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, 'output')
os.makedirs(OUT_DIR, exist_ok=True)

# ------------------------------
# Constants
# ------------------------------

PERIOD_CONFIG = {
    1: {"label": "1st", "time": "8:00 - 8:50"},
    2: {"label": "2nd", "time": "9:00 - 9:50"},
    3: {"label": "3rd", "time": "10:00 - 10:50"},
    4: {"label": "4th", "time": "11:00 - 11:50"},
    5: {"label": "5th", "time": "12:00 - 12:50"},
    6: {"label": "6th", "time": "1:00 - 1:30"},
    7: {"label": "7th", "time": "2:00 - 2:50"},
    8: {"label": "8th", "time": "3:00 - 3:50"},
    9: {"label": "9th", "time": "4:00 - 4:50"},
}

BREAK_TIME = "1:30 - 2:00"

DAY_MAPPING = {
    1: "Sa",
    2: "Su",
    3: "Mo",
    4: "Tu",
    5: "We",
    6: "Th",
    7: "Fr",
}

# ------------------------------
# Data models
# ------------------------------
TimeslotTuple = namedtuple('TimeslotTuple', ['day', 'period'])

@dataclass(frozen=True)
class SessionData:
    session_id: str
    class_id: str
    subject_id: str
    teacher_id: str
    room_id: Optional[str]

# ------------------------------
# Helpers
# ------------------------------

def write_csv(path: str, header: List[str], rows: List[List]):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)

# ------------------------------
# Data loading from Database
# ------------------------------

def load_settings(db: Session) -> Dict[str, str]:
    info = {
        'session_name': 'January 2025',
    }
    settings = db.query(Setting).all()
    for s in settings:
        if s.key != 'footer_right_text':
            info[s.key] = s.value
    return info

def load_teachers(db: Session) -> Dict[str, dict]:
    teachers = db.query(Teacher).all()
    return {t.teacher_id: {
        'name': t.name,
        'seniority': t.seniority,
        'max_load_day': t.max_load_day,
        'max_load_week': t.max_load_week,
    } for t in teachers}

def load_classes(db: Session) -> Dict[str, dict]:
    classes = db.query(Class).all()
    return {c.class_id: {'name': c.name, 'size': c.size} for c in classes}

def load_rooms(db: Session) -> Dict[str, dict]:
    rooms = db.query(Room).all()
    return {r.room_id: {
        'name': r.name,
        'capacity': r.capacity,
        'type': r.type or ''
    } for r in rooms}

def load_subjects(db: Session) -> Dict[str, dict]:
    subjects = db.query(Subject).all()
    subjects_data = {}
    for s in subjects:
        viable_rooms_str = s.viable_rooms or ""
        subjects_data[s.subject_id] = {
            'name': s.name,
            'duration': s.duration,
            'required_room_type': s.required_room_type or '',
            'viable_rooms': [r.strip() for r in viable_rooms_str.split(',') if r.strip()],
            'is_optional': bool(s.is_optional)
        }
    return subjects_data

def load_timeslots(db: Session) -> List[TimeslotTuple]:
    timeslots = db.query(Timeslot).all()
    ts_list = [TimeslotTuple(t.day, t.period) for t in timeslots]
    return sorted(ts_list)

def load_unavailability(db: Session) -> Dict[str, set]:
    unavail = defaultdict(set)
    items = db.query(TeacherUnavailability).all()
    for item in items:
        unavail[item.teacher_id].add(TimeslotTuple(item.day, item.period))
    return unavail

def load_teacher_preferences(db: Session) -> Dict[str, set]:
    prefs = defaultdict(set)
    items = db.query(TeacherPreference).all()
    for item in items:
        prefs[item.teacher_id].add(TimeslotTuple(item.day, item.period))
    return prefs

def load_curriculum(db: Session) -> List[SessionData]:
    items = db.query(Curriculum).all()
    sessions: List[SessionData] = []
    idx = 0
    for item in items:
        num_sessions = item.periods_per_week
        for k in range(num_sessions):
            idx += 1
            sessions.append(SessionData(
                session_id=f'S{idx}',
                class_id=item.class_id,
                subject_id=item.subject_id,
                teacher_id=item.teacher_id,
                room_id=item.room_id
            ))
    return sessions

# ------------------------------
# Home Room Assignment
# ------------------------------

def assign_home_rooms(classes: Dict[str, dict], rooms: Dict[str, dict]) -> Dict[str, str]:
    rooms_by_name = defaultdict(list)
    for room_id, room_info in rooms.items():
        if room_info['type'] == 'Theory':
            rooms_by_name[room_info['name']].append(room_id)

    sorted_room_groups = [rooms_by_name[name] for name in sorted(rooms_by_name.keys())]
    for group in sorted_room_groups:
        group.sort()

    classes_by_base = defaultdict(list)
    for class_id in classes:
        parts = re.split(r'([^a-zA-Z0-9])', class_id)
        if len(parts) > 2:
            base_name = "".join(parts[:-2])
        else:
            base_name = class_id[:-1]
        classes_by_base[base_name].append(class_id)

    sorted_class_groups = [classes_by_base[name] for name in sorted(classes_by_base.keys())]
    for group in sorted_class_groups:
        group.sort()

    if len(sorted_class_groups) > len(sorted_room_groups):
        raise ValueError("Not enough room groups to assign to all class groups.")

    home_room_map = {}
    for i, class_group in enumerate(sorted_class_groups):
        room_group = sorted_room_groups[i]
        if len(class_group) != len(room_group):
            raise ValueError(f"Mismatch in size for class group {class_group[0][:-1]} ({len(class_group)} sections) and room group '{rooms[room_group[0]]['name']}' ({len(room_group)} rooms).")

        for class_id, room_id in zip(class_group, room_group):
            home_room_map[class_id] = room_id

    return home_room_map

# ------------------------------
# Timetable solver (OR-Tools)
# ------------------------------

class ORTimetableSolver:
    def __init__(self, sessions, timeslots, rooms, classes, teachers, subjects, unavailability, teacher_preferences, home_room_map, time_limit_sec=30):
        self.sessions = sessions
        self.timeslots = timeslots
        self.rooms = rooms
        self.classes = classes
        self.teachers = teachers
        self.subjects = subjects
        self.unavailability = unavailability
        self.teacher_preferences = teacher_preferences
        self.home_room_map = home_room_map
        self.time_limit_sec = time_limit_sec
        self.model = cp_model.CpModel()
        self.possible_assignments_for_session = defaultdict(list)

    def solve(self) -> Tuple[bool, Dict[str, Tuple[TimeslotTuple, str]]]:
        assignment = self._create_decision_variables()
        session_starts_at = self._create_intermediate_variables(assignment)

        self._add_core_constraints(assignment, session_starts_at)
        self._add_structural_constraints(session_starts_at)
        self._add_scheduling_rules(session_starts_at)
        same_day_different_teacher_penalties = self._add_same_day_course_constraints(session_starts_at)
        self._add_soft_constraints(session_starts_at, same_day_different_teacher_penalties)
        
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.time_limit_sec
        status = solver.Solve(self.model)

        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            solution = {}
            for (session_id, t, r_id), var in assignment.items():
                if solver.Value(var):
                    solution[session_id] = (t, r_id)
            return True, solution
        else:
            return False, {}

    def _create_decision_variables(self) -> Dict:
        assignment = {}
        for s in self.sessions:
            subject = self.subjects[s.subject_id]
            is_lab = subject.get('required_room_type') == 'Lab' and subject.get('viable_rooms')

            possible_rooms = []
            if is_lab:
                for r_id in subject['viable_rooms']:
                    if r_id in self.rooms and self.classes[s.class_id]['size'] <= self.rooms[r_id]['capacity']:
                        possible_rooms.append(r_id)
            else:
                home_room = self.home_room_map.get(s.class_id)
                if home_room:
                    possible_rooms.append(home_room)

            for t in self.timeslots:
                for r_id in possible_rooms:
                    var = self.model.NewBoolVar(f'assign_{s.session_id}_{t.day}_{t.period}_{r_id}')
                    key = (s.session_id, t, r_id)
                    assignment[key] = var
                    self.possible_assignments_for_session[s.session_id].append(var)
        return assignment

    def _create_intermediate_variables(self, assignment: Dict) -> Dict:
        session_starts_at = {}
        for s in self.sessions:
            for t in self.timeslots:
                var = self.model.NewBoolVar(f'starts_{s.session_id}_{t.day}_{t.period}')
                session_starts_at[(s.session_id, t)] = var
                possible_assignments_at_t = []
                for (session_id, timeslot, r_id), assign_var in assignment.items():
                    if session_id == s.session_id and timeslot == t:
                        possible_assignments_at_t.append(assign_var)
                if possible_assignments_at_t:
                    self.model.Add(sum(possible_assignments_at_t) == var)
                else:
                    self.model.Add(var == 0)
        return session_starts_at

    def _add_core_constraints(self, assignment: Dict, session_starts_at: Dict):
        for s in self.sessions:
            self.model.AddExactlyOne(self.possible_assignments_for_session[s.session_id])

        for t in self.timeslots:
            for teacher_id in self.teachers:
                active_sessions = []
                for s in self.sessions:
                    if s.teacher_id == teacher_id:
                        duration = self.subjects[s.subject_id]['duration']
                        for i in range(duration):
                            start_t = TimeslotTuple(t.day, t.period - i)
                            if (s.session_id, start_t) in session_starts_at:
                                active_sessions.append(session_starts_at[(s.session_id, start_t)])
                self.model.Add(sum(active_sessions) <= 1)

            for class_id in self.classes:
                active_sessions = []
                for s in self.sessions:
                    if s.class_id == class_id:
                        duration = self.subjects[s.subject_id]['duration']
                        for i in range(duration):
                            start_t = TimeslotTuple(t.day, t.period - i)
                            if (s.session_id, start_t) in session_starts_at:
                                active_sessions.append(session_starts_at[(s.session_id, start_t)])
                self.model.Add(sum(active_sessions) <= 1)

            for r_id in self.rooms:
                active_sessions_in_room = []
                for s in self.sessions:
                    subject = self.subjects[s.subject_id]
                    if r_id not in subject.get('viable_rooms', []):
                        continue
                    duration = subject['duration']
                    for i in range(duration):
                        start_t = TimeslotTuple(t.day, t.period - i)
                        key = (s.session_id, start_t, r_id)
                        if key in assignment:
                            active_sessions_in_room.append(assignment[key])
                self.model.Add(sum(active_sessions_in_room) <= 1)
        
        for teacher_id, teacher_info in self.teachers.items():
            weekly_load_vars = []
            for s in self.sessions:
                if s.teacher_id == teacher_id:
                    for t in self.timeslots:
                        weekly_load_vars.append(session_starts_at[(s.session_id, t)] * self.subjects[s.subject_id]['duration'])
            self.model.Add(sum(weekly_load_vars) <= teacher_info['max_load_week'])

            for day in sorted(list(set(t.day for t in self.timeslots))):
                daily_load_vars = []
                for s in self.sessions:
                    if s.teacher_id == teacher_id:
                        for t in self.timeslots:
                            if t.day == day:
                                daily_load_vars.append(session_starts_at[(s.session_id, t)] * self.subjects[s.subject_id]['duration'])
                self.model.Add(sum(daily_load_vars) <= teacher_info['max_load_day'])

        for s in self.sessions:
            for t in self.timeslots:
                if t in self.unavailability.get(s.teacher_id, set()):
                    self.model.Add(session_starts_at[(s.session_id, t)] == 0)

    def _add_structural_constraints(self, session_starts_at: Dict):
        for s in self.sessions:
            duration = self.subjects[s.subject_id]['duration']
            if duration > 1:
                for t_idx, t in enumerate(self.timeslots):
                    max_period_for_day = max(ts.period for ts in self.timeslots if ts.day == t.day)
                    if t.period > max_period_for_day - duration + 1:
                        self.model.Add(session_starts_at[(s.session_id, t)] == 0)
                    if t_idx + duration - 1 < len(self.timeslots):
                        end_t = self.timeslots[t_idx + duration - 1]
                        if t.day != end_t.day:
                             self.model.Add(session_starts_at[(s.session_id, t)] == 0)

        optional_course_subjects = {'HUM101', 'HUM103'}
        main_classes = {'12A', '12B', '12C'}
        optional_classes = {'12A1', '12A2', '12B1', '12B2'}

        for t in self.timeslots:
            is_optional_slot = self.model.NewBoolVar(f'optional_slot_{t.day}_{t.period}')
            optional_sessions_at_t = [session_starts_at[(s.session_id, t)] for s in self.sessions if s.class_id in optional_classes]
            if optional_sessions_at_t:
                self.model.Add(sum(optional_sessions_at_t) > 0).OnlyEnforceIf(is_optional_slot)
                self.model.Add(sum(optional_sessions_at_t) == 0).OnlyEnforceIf(is_optional_slot.Not())
                for s in self.sessions:
                    if s.class_id in main_classes and s.subject_id not in optional_course_subjects:
                        self.model.AddImplication(is_optional_slot, session_starts_at[(s.session_id, t)].Not())

    def _add_scheduling_rules(self, session_starts_at: Dict):
        for s in self.sessions:
            subject = self.subjects[s.subject_id]
            is_lab = subject.get('required_room_type') == 'Lab'
            is_optional = subject.get('is_optional', False)
            is_theory = not is_lab and not is_optional
            for t in self.timeslots:
                if t.period == 6:
                    self.model.Add(session_starts_at[(s.session_id, t)] == 0)
                if is_lab and t.period not in [1, 4, 7]:
                    self.model.Add(session_starts_at[(s.session_id, t)] == 0)
                if is_theory and t.period in [7, 8, 9]:
                    self.model.Add(session_starts_at[(s.session_id, t)] == 0)

    def _add_same_day_course_constraints(self, session_starts_at: Dict):
        sessions_by_class_subject = defaultdict(list)
        for s in self.sessions:
            sessions_by_class_subject[(s.class_id, s.subject_id)].append(s)

        same_day_different_teacher_penalties = []
        all_days = sorted(list(set(t.day for t in self.timeslots)))
        session_on_day = {}
        for s in self.sessions:
            for day in all_days:
                var = self.model.NewBoolVar(f'session_{s.session_id}_on_day_{day}')
                session_on_day[(s.session_id, day)] = var
                starts_on_day = [session_starts_at[(s.session_id, t)] for t in self.timeslots if t.day == day and (s.session_id, t) in session_starts_at]
                if starts_on_day:
                    self.model.Add(sum(starts_on_day) == var)
                else:
                    self.model.Add(var == 0)

        for (class_id, subject_id), sessions_in_group in sessions_by_class_subject.items():
            if len(sessions_in_group) < 2:
                continue
            sessions_by_teacher = defaultdict(list)
            for s in sessions_in_group:
                sessions_by_teacher[s.teacher_id].append(s)
            for teacher_id, same_teacher_sessions in sessions_by_teacher.items():
                if len(same_teacher_sessions) < 2:
                    continue
                for i in range(len(same_teacher_sessions)):
                    for j in range(i + 1, len(same_teacher_sessions)):
                        s1, s2 = same_teacher_sessions[i], same_teacher_sessions[j]
                        for day in all_days:
                            self.model.Add(session_on_day[(s1.session_id, day)] + session_on_day[(s2.session_id, day)] <= 1)

            teacher_ids = list(sessions_by_teacher.keys())
            for i in range(len(teacher_ids)):
                for j in range(i + 1, len(teacher_ids)):
                    teacher1_sessions = sessions_by_teacher[teacher_ids[i]]
                    teacher2_sessions = sessions_by_teacher[teacher_ids[j]]
                    for s1 in teacher1_sessions:
                        for s2 in teacher2_sessions:
                            for day in all_days:
                                both_on_day = self.model.NewBoolVar(f'both_on_day_{s1.session_id}_{s2.session_id}_{day}')
                                self.model.Add(session_on_day[(s1.session_id, day)] + session_on_day[(s2.session_id, day)] == 2).OnlyEnforceIf(both_on_day)
                                self.model.Add(session_on_day[(s1.session_id, day)] + session_on_day[(s2.session_id, day)] < 2).OnlyEnforceIf(both_on_day.Not())
                                same_day_different_teacher_penalties.append(both_on_day)
        return same_day_different_teacher_penalties
    
    def _add_soft_constraints(self, session_starts_at: Dict, same_day_different_teacher_penalties: List):
        objective_terms = []
        for s in self.sessions:
            teacher_id = s.teacher_id
            teacher_info = self.teachers.get(teacher_id)
            if not teacher_info: continue
            seniority = teacher_info['seniority']
            preferences = self.teacher_preferences.get(teacher_id, set())
            for t in preferences:
                if (s.session_id, t) in session_starts_at:
                    objective_terms.append(session_starts_at[(s.session_id, t)] * seniority)
        
        penalty_for_late_optional = -1000
        for s in self.sessions:
            subject = self.subjects[s.subject_id]
            if subject.get('is_optional', False):
                for t in self.timeslots:
                    if t.period in [7, 8, 9]:
                        if (s.session_id, t) in session_starts_at:
                            objective_terms.append(session_starts_at[(s.session_id, t)] * penalty_for_late_optional)

        penalty_same_day_course = -1000
        for penalty_var in same_day_different_teacher_penalties:
            objective_terms.append(penalty_var * penalty_same_day_course)

        if objective_terms:
            self.model.Maximize(sum(objective_terms))

# ------------------------------
# Output generation
# ------------------------------

def format_class_name(class_id: str) -> str:
    if len(class_id) >= 3 and class_id[0].isdigit() and class_id[1].isdigit():
        level, term, sec = class_id[0], class_id[1], class_id[2:]
        return f"ME L-{level}/T-{term} (Sec {sec})"
    return f"ME {class_id}"

def format_room_id(room_id: str, rooms: Dict[str, dict]) -> str:
    room_info = rooms.get(room_id, {})
    if room_info.get('type') == 'Theory':
        return f"ME {room_id}"
    return room_id

def write_home_rooms_csv(home_room_map: Dict[str, str], rooms: Dict[str, dict]):
    header = ['class_id', 'home_room']
    rows = [[cid, rid] for cid, rid in sorted(home_room_map.items())]
    path = os.path.join(OUT_DIR, 'homerooms.csv')
    write_csv(path, header, rows)

def create_output_tables(assignment: Dict[str, Tuple[TimeslotTuple, str]], sessions: List[SessionData], teachers: Dict[str, dict], classes: Dict[str, dict], rooms: Dict[str, dict], subjects: Dict[str, dict], timeslots: List[TimeslotTuple], home_room_map: Dict[str, str], info: Dict[str, str]):
    sessions_by_id = {s.session_id: s for s in sessions}
    days = sorted(list(set(t.day for t in timeslots)))
    periods = sorted(list(set(t.period for t in timeslots)))

    css = """
    <style>
        body { font-family: Arial, sans-serif; }
        .timetable { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .timetable th, .timetable td { border: 1px solid black; padding: 5px; text-align: center; vertical-align: middle; height: 80px; position: relative; }
        .period-header { font-size: 14px; font-weight: bold; }
        .time-header { font-size: 10px; font-weight: normal; }
        .day-label { font-size: 40px; font-weight: normal; width: 80px; }
        .subject-id { font-size: 18px; font-weight: normal; display: block; margin-bottom: 5px; }
        .teacher-id { font-size: 10px; position: absolute; bottom: 5px; right: 5px; }
        .room-info { font-size: 10px; position: absolute; bottom: 5px; left: 5px; }
        .break-cell { width: 40px; }
        .home-room { text-align: right; font-size: 14px; margin-bottom: 5px; }
        .header-title { text-align: center; margin-bottom: 0; }
        .class-title { text-align: center; font-size: 48px; margin-top: 0; margin-bottom: 10px; }
        .footer { width: 100%; margin-top: 20px; font-size: 12px; }
        .footer-left { float: left; }
        .footer-right { float: right; }
        .clearfix::after { content: ""; clear: both; display: table; }
    </style>
    """
    generated_time = datetime.now().strftime("%d/%m/%Y")

    for class_id, cinfo in classes.items():
        grid = [[None for _ in periods] for _ in days]
        covered = [[False for _ in periods] for _ in days]
        for sid, (t, r) in assignment.items():
            s = sessions_by_id.get(sid)
            if s and s.class_id == class_id:
                di, pi = days.index(t.day), periods.index(t.period)
                grid[di][pi] = sid

        html = f"<html><head>{css}</head><body>"
        html += f"<div class='header-title'>Final Term Routine (Term: {info.get('session_name', 'N/A')})</div>"
        html += f"<div class='class-title'>{format_class_name(class_id)}</div>"
        hr_id = home_room_map.get(class_id)
        if hr_id:
            formatted_hr = format_room_id(hr_id, rooms)
            html += f"<div class='home-room'>R#{formatted_hr}</div>"

        html += "<table class='timetable'><tr><th></th>"
        for p in periods:
            p_label, p_time = PERIOD_CONFIG.get(p, {}).get('label', f"{p}th"), PERIOD_CONFIG.get(p, {}).get('time', '')
            html += f"<th><div class='period-header'>{p_label}</div><div class='time-header'>{p_time}</div></th>"
            if p == 6:
                html += f"<th rowspan='{len(days) + 1}' class='break-cell'>Break<br><br><div class='time-header'>{BREAK_TIME}</div></th>"
        html += "</tr>"

        for d_idx, d in enumerate(days):
            html += f"<tr><td class='day-label'>{DAY_MAPPING.get(d, str(d))}</td>"
            for p_idx, p in enumerate(periods):
                if covered[d_idx][p_idx]: continue
                sid = grid[d_idx][p_idx]
                if sid:
                    s = sessions_by_id[sid]
                    colspan = subjects[s.subject_id]['duration']
                    for i in range(colspan):
                        if p_idx + i < len(periods): covered[d_idx][p_idx + i] = True
                    t_val, cell_r_id = assignment[sid]
                    room_info_display = ""
                    subject = subjects[s.subject_id]
                    if subject.get('required_room_type') == 'Lab':
                        room_name = rooms.get(cell_r_id, {}).get('name', cell_r_id)
                        room_info_display = f"<div class='room-info'>{room_name} #{cell_r_id}</div>"
                    html += f"<td colspan='{colspan}'><span class='subject-id'>{s.subject_id}</span><div class='teacher-id'>{s.teacher_id}</div>{room_info_display}</td>"
                else: html += "<td></td>"
            html += "</tr>"
        html += f"</table><div class='footer clearfix'><div class='footer-left'>Timetable generated:{generated_time}</div><div class='footer-right'>Cadence</div></div></body></html>"
        with open(os.path.join(OUT_DIR, f'class_{class_id}_timetable.html'), 'w', encoding='utf-8') as f: f.write(html)

    for teacher_id, tinfo in teachers.items():
        grid, covered = [[None for _ in periods] for _ in days], [[False for _ in periods] for _ in days]
        for sid, (t, r) in assignment.items():
            s = sessions_by_id.get(sid)
            if s and s.teacher_id == teacher_id:
                di, pi = days.index(t.day), periods.index(t.period)
                grid[di][pi] = sid

        html = f"<html><head>{css}</head><body><div class='header-title'>Teacher Routine (Term: {info.get('session_name', 'N/A')})</div>"
        html += f"<div class='class-title'>{teachers.get(teacher_id, {}).get('name', teacher_id)} ({teacher_id})</div>"
        html += "<table class='timetable'><tr><th></th>"
        for p in periods:
            p_label, p_time = PERIOD_CONFIG.get(p, {}).get('label', f"{p}th"), PERIOD_CONFIG.get(p, {}).get('time', '')
            html += f"<th><div class='period-header'>{p_label}</div><div class='time-header'>{p_time}</div></th>"
            if p == 6: html += f"<th rowspan='{len(days) + 1}' class='break-cell'>Break<br><br><div class='time-header'>{BREAK_TIME}</div></th>"
        html += "</tr>"

        for d_idx, d in enumerate(days):
            html += f"<tr><td class='day-label'>{DAY_MAPPING.get(d, str(d))}</td>"
            for p_idx, p in enumerate(periods):
                if covered[d_idx][p_idx]: continue
                sid = grid[d_idx][p_idx]
                if sid:
                    s = sessions_by_id[sid]
                    colspan = subjects[s.subject_id]['duration']
                    for i in range(colspan):
                        if p_idx + i < len(periods): covered[d_idx][p_idx + i] = True
                    t_val, cell_r_id = assignment[sid]
                    formatted_room = format_room_id(cell_r_id, rooms)
                    html += f"<td colspan='{colspan}'><span class='subject-id'>{s.subject_id}</span><div class='teacher-id'>{s.class_id}</div><div class='room-info'>{formatted_room}</div></td>"
                else: html += "<td></td>"
            html += "</tr>"
        html += f"</table><div class='footer clearfix'><div class='footer-left'>Timetable generated:{generated_time}</div><div class='footer-right'>Cadence</div></div></body></html>"
        with open(os.path.join(OUT_DIR, f'teacher_{teacher_id}_timetable.html'), 'w', encoding='utf-8') as f: f.write(html)

    combined_rows = [['session_id', 'class', 'subject', 'teacher', 'day', 'period', 'room']]
    for sid, (t, r) in sorted(assignment.items(), key=lambda x: (x[1][0].day, x[1][0].period)):
        s = sessions_by_id.get(sid)
        if s: combined_rows.append([sid, s.class_id, subjects.get(s.subject_id, {}).get('name', 'N/A'), teachers.get(s.teacher_id, {}).get('name', 'N/A'), t.day, t.period, r])
    write_csv(os.path.join(OUT_DIR, 'all_assignments.csv'), combined_rows[0], combined_rows[1:])

# ------------------------------
# Main
# ------------------------------

def run():
    db = SessionLocal()
    try:
        info = load_settings(db)
        optional_included = False
        teachers = load_teachers(db)
        classes = load_classes(db)
        rooms = load_rooms(db)
        subjects = load_subjects(db)
        timeslots = load_timeslots(db)
        unavailability = load_unavailability(db)
        teacher_preferences = load_teacher_preferences(db)
        sessions = load_curriculum(db)

        active_class_ids = {s.class_id for s in sessions}
        active_classes = {cid: cinfo for cid, cinfo in classes.items() if cid in active_class_ids}

        try:
            home_room_map = assign_home_rooms(active_classes, rooms)
        except ValueError as e:
            return {'status': f"ERROR: {e}", 'sessions_total': 0, 'sessions_scheduled': 0, 'output_dir': OUT_DIR}

        if not optional_included:
            optional_subject_ids = {sid for sid, data in subjects.items() if data.get('is_optional', False)}
            sessions = [s for s in sessions if s.subject_id not in optional_subject_ids]

        if not sessions:
            return {'status': "ERROR: No valid session data found.", 'sessions_total': 0, 'sessions_scheduled': 0, 'output_dir': OUT_DIR}

        solver = ORTimetableSolver(sessions, timeslots, rooms, classes, teachers, subjects, unavailability, teacher_preferences, home_room_map)
        success, assignment = solver.solve()

        status = "SUCCESS: Timetable generated." if success else "ERROR: No solution found."
        if success:
            create_output_tables(assignment, sessions, teachers, classes, rooms, subjects, timeslots, home_room_map, info)
            write_home_rooms_csv(home_room_map, rooms)

        return {
            'status': status, 'sessions_total': len(sessions),
            'sessions_scheduled': len(assignment), 'output_dir': OUT_DIR
        }
    finally:
        db.close()

if __name__ == '__main__':
    start_time = time.time()
    res = run()
    for key, value in res.items(): print(f"{key}: {value}")
    print(f"Total time: {time.time() - start_time:.2f} seconds")
