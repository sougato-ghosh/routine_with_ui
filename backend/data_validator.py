import pandas as pd
import logging
import os
from collections import defaultdict
from sqlalchemy.orm import Session
from database import SessionLocal
from models import (
    Teacher, Room, Class, Subject, Curriculum, SubjectOfAllSemester, Setting
)

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE_DIR, 'warnings.log')

# --- Setup Logging ---
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.WARNING,
    format='%(levelname)s: %(message)s',
    filemode='w'
)

def load_data_from_db(db: Session, user_id: str = "default_user"):
    """Loads all necessary data from the database into a dictionary of DataFrames."""
    data = {}
    try:
        data['teachers.csv'] = pd.read_sql(db.query(Teacher).filter(Teacher.user_id == user_id).statement, db.bind)
        data['rooms.csv'] = pd.read_sql(db.query(Room).filter(Room.user_id == user_id).statement, db.bind)
        data['classes.csv'] = pd.read_sql(db.query(Class).filter(Class.user_id == user_id).statement, db.bind)
        data['subjects.csv'] = pd.read_sql(db.query(Subject).filter(Subject.user_id == user_id).statement, db.bind)
        data['curriculum.csv'] = pd.read_sql(db.query(Curriculum).filter(Curriculum.user_id == user_id).statement, db.bind)
        data['subjects_of_all_semester.csv'] = pd.read_sql(db.query(SubjectOfAllSemester).filter(SubjectOfAllSemester.user_id == user_id).statement, db.bind)
        return data, True
    except Exception as e:
        logging.error(f"CRITICAL: Failed to load data from database: {e}")
        return {}, False

def check_referential_integrity(datasets):
    curriculum_df = datasets['curriculum.csv']
    teachers_df = datasets['teachers.csv']
    classes_df = datasets['classes.csv']
    subjects_df = datasets['subjects.csv']

    teacher_ids = set(teachers_df['teacher_id'])
    class_ids = set(classes_df['class_id'])
    # Subject matching now uses (class_id prefix, subject_id)
    subject_keys = set(zip(subjects_df['class_id'].astype(str), subjects_df['subject_id']))

    issues = []
    for index, row in curriculum_df.iterrows():
        if row['teacher_id'] not in teacher_ids:
            msg = f"Teacher ID '{row['teacher_id']}' not found in teachers table."
            logging.warning(f"Referential Integrity: In curriculum, {msg}")
            issues.append({"type": "warning", "category": "Referential Integrity", "message": msg})
        if row['class_id'] not in class_ids:
            msg = f"Class ID '{row['class_id']}' not found in classes table."
            logging.warning(f"Referential Integrity: In curriculum, {msg}")
            issues.append({"type": "warning", "category": "Referential Integrity", "message": msg})

        lt_prefix = str(row['class_id'])[:2]
        if (lt_prefix, row['subject_id']) not in subject_keys:
            msg = f"Subject ID '{row['subject_id']}' for class prefix '{lt_prefix}' not found in subjects table."
            logging.warning(f"Referential Integrity: In curriculum, {msg}")
            issues.append({"type": "warning", "category": "Referential Integrity", "message": msg})

    return issues

def check_duplicate_ids(datasets):
    # Mapping of filenames to lists of columns that should be unique together
    files_and_keys = {
        'teachers.csv': ['teacher_id'],
        'subjects.csv': ['class_id', 'subject_id'],
        'rooms.csv': ['room_id'],
        'classes.csv': ['class_id']
    }
    issues = []
    for filename, keys in files_and_keys.items():
        df = datasets[filename]
        duplicates = df[df.duplicated(subset=keys, keep=False)]
        if not duplicates.empty:
            for index, row in duplicates.drop_duplicates(subset=keys).iterrows():
                key_desc = ", ".join([f"{k} '{row[k]}'" for k in keys])
                msg = f"In {filename.replace('.csv', '')} table, duplicate {key_desc} found."
                logging.error(f"Duplicate ID: {msg}")
                issues.append({"type": "error", "category": "Duplicate ID", "message": msg})
    return issues

def check_teacher_workload(datasets, days_per_week):
    curriculum_df = datasets['curriculum.csv'].copy()
    teachers_df = datasets['teachers.csv']
    subjects_df = datasets['subjects.csv']

    # Add class_prefix to curriculum for merging
    curriculum_df_copy = curriculum_df.copy()
    curriculum_df_copy['class_prefix'] = curriculum_df_copy['class_id'].astype(str).str[:2]
    curriculum_df_copy['subject_id'] = curriculum_df_copy['subject_id'].astype(str)

    subjects_df_copy = subjects_df.copy()
    subjects_df_copy['class_id'] = subjects_df_copy['class_id'].astype(str)
    subjects_df_copy['subject_id'] = subjects_df_copy['subject_id'].astype(str)

    merged_df = pd.merge(
        curriculum_df_copy,
        subjects_df_copy,
        left_on=['class_prefix', 'subject_id'],
        right_on=['class_id', 'subject_id'],
        suffixes=('', '_subj')
    )

    issues = []
    for _, teacher_info in teachers_df.iterrows():
        teacher_id = teacher_info['teacher_id']
        max_week = teacher_info['max_load_week']
        max_day = teacher_info['max_load_day']
        teacher_schedule = merged_df[merged_df['teacher_id'] == teacher_id]
        total_weekly_load = (teacher_schedule['periods_per_week'] * teacher_schedule['duration']).sum()
        if total_weekly_load > max_week:
            msg = f"Teacher '{teacher_id}' is overloaded. Assigned: {total_weekly_load} hrs, Max: {max_week} hrs."
            logging.error(f"Teacher Workload (Weekly): {msg}")
            issues.append({"type": "error", "category": "Teacher Workload", "message": msg})
        courses = []
        for _, row in teacher_schedule.iterrows():
            for _ in range(row['periods_per_week']):
                courses.append(row['duration'])
        for course_duration in courses:
            if course_duration > max_day:
                msg = f"Teacher '{teacher_id}' has a course of duration {course_duration} hrs, which exceeds their daily limit of {max_day} hrs."
                logging.error(f"Teacher Workload (Daily): {msg}")
                issues.append({"type": "error", "category": "Teacher Workload", "message": msg})
        if len(courses) > days_per_week:
            courses.sort()
            if (courses[0] + courses[1]) > max_day:
                msg = f"Teacher '{teacher_id}' has {len(courses)} courses to teach in {days_per_week} days, forcing multiple classes on at least one day. Shortest courses ({courses[0]} + {courses[1]} hrs) exceed max {max_day} hrs."
                logging.error(f"Teacher Workload (Daily): {msg}")
                issues.append({"type": "error", "category": "Teacher Workload", "message": msg})
    return issues

def check_course_credits(datasets):
    curriculum_df = datasets['curriculum.csv']
    subjects_df = datasets['subjects.csv']

    # Subject data indexed by (class_id, subject_id)
    subjects_df_copy = subjects_df.copy()
    subjects_df_copy['class_id'] = subjects_df_copy['class_id'].astype(str)
    subjects_df_copy['subject_id'] = subjects_df_copy['subject_id'].astype(str)
    subject_map = subjects_df_copy.set_index(['class_id', 'subject_id']).to_dict('index')

    issues = []
    # Curriculum is grouped by class_id and subject_id to check total periods assigned
    curriculum_df_copy = curriculum_df.copy()
    curriculum_df_copy['class_id'] = curriculum_df_copy['class_id'].astype(str)
    curriculum_df_copy['subject_id'] = curriculum_df_copy['subject_id'].astype(str)

    grouped = curriculum_df_copy.groupby(['class_id', 'subject_id'])
    for (class_id, subject_id), group in grouped:
        class_prefix = str(class_id)[:2]
        subj_key = (class_prefix, subject_id)

        if subj_key in subject_map:
            subj_info = subject_map[subj_key]
            # Only validate Theory subjects (required_room_type is empty, null, or 'Theory')
            room_type = subj_info.get('required_room_type')
            is_theory = not room_type or pd.isna(room_type) or str(room_type).strip().lower() == 'theory'

            if is_theory:
                total_periods = group['periods_per_week'].sum()
                duration = subj_info.get('duration', 1)
                expected_credit = subj_info.get('credit', 0.0)

                # Formula: periods_per_week * duration == credit
                if (total_periods * duration) != expected_credit:
                    msg = f"Credit mismatch for class '{class_id}' and subject '{subject_id}'. " \
                          f"Assigned: {total_periods} periods * {duration} hrs = {total_periods * duration}, " \
                          f"Expected Credit: {expected_credit}."
                    logging.warning(f"Course Credit: {msg}")
                    issues.append({"type": "warning", "category": "Course Credit", "message": msg})
    return issues

def validate_data(user_id: str = "default_user"):
    db = SessionLocal()
    all_issues = []
    try:
        datasets, success = load_data_from_db(db, user_id)
        if not success:
            msg = "Critical error: Data could not be loaded from database."
            logging.error(msg)
            return [{"type": "error", "category": "System", "message": msg}]

        all_issues.extend(check_referential_integrity(datasets))
        all_issues.extend(check_duplicate_ids(datasets))

        settings = {s.key: s.value for s in db.query(Setting).filter(Setting.user_id == user_id).all()}
        days_per_week = int(settings.get('days_num', 5))
        all_issues.extend(check_teacher_workload(datasets, days_per_week))

        all_issues.extend(check_course_credits(datasets))
        return all_issues
    finally:
        db.close()

def main():
    validate_data()

if __name__ == "__main__":
    main()
