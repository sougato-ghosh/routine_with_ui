import pandas as pd
import logging
import os
from collections import defaultdict
from sqlalchemy.orm import Session
from database import SessionLocal
from models import (
    Teacher, Room, Class, Subject, Timeslot, Curriculum, SubjectOfAllSemester
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

def load_data_from_db(db: Session):
    """Loads all necessary data from the database into a dictionary of DataFrames."""
    data = {}
    try:
        data['teachers.csv'] = pd.read_sql(db.query(Teacher).statement, db.bind)
        data['rooms.csv'] = pd.read_sql(db.query(Room).statement, db.bind)
        data['classes.csv'] = pd.read_sql(db.query(Class).statement, db.bind)
        data['subjects.csv'] = pd.read_sql(db.query(Subject).statement, db.bind)
        data['timeslots.csv'] = pd.read_sql(db.query(Timeslot).statement, db.bind)
        data['curriculum.csv'] = pd.read_sql(db.query(Curriculum).statement, db.bind)
        data['subjects_of_all_semester.csv'] = pd.read_sql(db.query(SubjectOfAllSemester).statement, db.bind)
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
    subject_ids = set(subjects_df['subject_id'])

    found_issues = False
    for index, row in curriculum_df.iterrows():
        if row['teacher_id'] not in teacher_ids:
            logging.warning(f"Referential Integrity: In curriculum, teacher_id '{row['teacher_id']}' not found in teachers table.")
            found_issues = True
        if row['class_id'] not in class_ids:
            logging.warning(f"Referential Integrity: In curriculum, class_id '{row['class_id']}' not found in classes table.")
            found_issues = True
        if row['subject_id'] not in subject_ids:
            logging.warning(f"Referential Integrity: In curriculum, subject_id '{row['subject_id']}' not found in subjects table.")
            found_issues = True

    if not found_issues:
        pass

def check_duplicate_ids(datasets):
    files_and_keys = {
        'teachers.csv': 'teacher_id',
        'subjects.csv': 'subject_id',
        'rooms.csv': 'room_id',
        'classes.csv': 'class_id'
    }
    found_issues = False
    for filename, key in files_and_keys.items():
        df = datasets[filename]
        duplicates = df[df.duplicated(subset=[key], keep=False)]
        if not duplicates.empty:
            found_issues = True
            for index, row in duplicates.iterrows():
                logging.error(f"Duplicate ID: In {filename.replace('.csv', '')} table, duplicate {key} '{row[key]}' found.")
    if not found_issues:
        pass

def check_teacher_workload(datasets, days_per_week):
    curriculum_df = datasets['curriculum.csv']
    teachers_df = datasets['teachers.csv']
    subjects_df = datasets['subjects.csv']
    merged_df = pd.merge(curriculum_df, subjects_df, on='subject_id')
    found_issues = False
    for _, teacher_info in teachers_df.iterrows():
        teacher_id = teacher_info['teacher_id']
        max_week = teacher_info['max_load_week']
        max_day = teacher_info['max_load_day']
        teacher_schedule = merged_df[merged_df['teacher_id'] == teacher_id]
        total_weekly_load = (teacher_schedule['periods_per_week'] * teacher_schedule['duration']).sum()
        if total_weekly_load > max_week:
            logging.error(f"Teacher Workload (Weekly): Teacher '{teacher_id}' is overloaded. Assigned: {total_weekly_load} hrs, Max: {max_week} hrs.")
            found_issues = True
        courses = []
        for _, row in teacher_schedule.iterrows():
            for _ in range(row['periods_per_week']):
                courses.append(row['duration'])
        for course_duration in courses:
            if course_duration > max_day:
                logging.error(f"Teacher Workload (Daily): Teacher '{teacher_id}' has a course of duration {course_duration} hrs, which exceeds their daily limit of {max_day} hrs.")
                found_issues = True
        if len(courses) > days_per_week:
            courses.sort()
            if (courses[0] + courses[1]) > max_day:
                logging.error(f"Teacher Workload (Daily): Teacher '{teacher_id}' has {len(courses)} courses to teach in {days_per_week} days, forcing multiple classes on at least one day. Shortest courses ({courses[0]} + {courses[1]} hrs) exceed max {max_day} hrs.")
                found_issues = True
    if not found_issues:
        pass

def check_course_credits(datasets):
    curriculum_df = datasets['curriculum.csv']
    subjects_df = datasets['subjects.csv']
    subjects_all_sem_df = datasets['subjects_of_all_semester.csv']
    theory_subjects = subjects_df[subjects_df['required_room_type'].isnull() | (subjects_df['required_room_type'] == '')]
    theory_subject_ids = set(theory_subjects['subject_id'])
    credit_map = subjects_all_sem_df.set_index('subject_id')['credit'].to_dict()
    found_issues = False
    grouped = curriculum_df.groupby(['class_id', 'subject_id'])
    for (class_id, subject_id), group in grouped:
        if subject_id in theory_subject_ids:
            total_periods = group['periods_per_week'].sum()
            expected_credit = credit_map.get(subject_id)
            if expected_credit is not None and total_periods != expected_credit:
                logging.warning(f"Course Credit: Mismatch for class '{class_id}' and subject '{subject_id}'. Assigned: {total_periods}, Expected: {expected_credit}.")
                found_issues = True
    if not found_issues:
        pass

def main():
    db = SessionLocal()
    try:
        datasets, success = load_data_from_db(db)
        if not success:
            logging.error(f"Critical error: Data could not be loaded from database.")
            return
        check_referential_integrity(datasets)
        check_duplicate_ids(datasets)
        days_per_week = datasets['timeslots.csv']['day'].nunique()
        check_teacher_workload(datasets, days_per_week)
        check_course_credits(datasets)
    finally:
        db.close()

if __name__ == "__main__":
    main()
