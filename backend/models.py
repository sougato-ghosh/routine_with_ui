from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Teacher(Base):
    __tablename__ = 'teachers'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    teacher_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, nullable=False, default="ME")
    seniority = Column(Integer, default=1)
    max_load_day = Column(Integer, default=6)
    max_load_week = Column(Integer, default=30)

class Room(Base):
    __tablename__ = 'rooms'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    room_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    capacity = Column(Integer, default=40)
    type = Column(String) # Theory, Lab, etc.

class Class(Base):
    __tablename__ = 'classes'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    class_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    size = Column(Integer, default=40)

class Subject(Base):
    __tablename__ = 'subjects'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    class_id = Column(String)
    subject_id = Column(String, nullable=False)
    dept = Column(String)
    name = Column(String, nullable=False)
    duration = Column(Integer, default=1)
    required_room_type = Column(String)
    viable_rooms = Column(String) # Comma-separated list of room IDs
    is_optional = Column(Boolean, default=False)

class Curriculum(Base):
    __tablename__ = 'curriculum'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    class_id = Column(String, nullable=False)
    subject_id = Column(String, nullable=False)
    dept = Column(String)
    teacher_id = Column(String, nullable=False)
    periods_per_week = Column(Integer, default=1)

class TeacherUnavailability(Base):
    __tablename__ = 'teacher_unavailability'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    teacher_id = Column(String, nullable=False)
    day = Column(Integer, nullable=False)
    period = Column(Integer, nullable=False)

class TeacherPreference(Base):
    __tablename__ = 'teacher_preferences'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    teacher_id = Column(String, nullable=False)
    day = Column(Integer, nullable=False)
    period = Column(Integer, nullable=False)

class SubjectOfAllSemester(Base):
    __tablename__ = 'subjects_of_all_semester'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    subject_id = Column(String, unique=True, nullable=False)
    credit = Column(Float, default=3.0)

class Setting(Base):
    __tablename__ = 'settings'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    key = Column(String, unique=True, nullable=False)
    value = Column(String)

class Term(Base):
    __tablename__ = 'terms'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    name = Column(String, unique=True, nullable=False) # e.g. "1-1", "1-2"
    is_active = Column(Boolean, default=True)

class Schedule(Base):
    __tablename__ = 'schedules'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    name = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    is_active = Column(Boolean, default=False)

class ScheduleAssignment(Base):
    __tablename__ = 'schedule_assignments'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    schedule_id = Column(Integer, ForeignKey('schedules.id'), nullable=False)
    class_id = Column(String, nullable=False)
    class_name = Column(String)
    subject_id = Column(String, nullable=False)
    subject_name = Column(String)
    teacher_id = Column(String, nullable=False)
    teacher_name = Column(String)
    room_id = Column(String, nullable=False)
    room_name = Column(String)
    day = Column(Integer, nullable=False)
    period = Column(Integer, nullable=False)
    duration = Column(Integer, default=1)
    is_lab = Column(Boolean, default=False)

class ScheduleHomeRoom(Base):
    __tablename__ = 'schedule_home_rooms'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    schedule_id = Column(Integer, ForeignKey('schedules.id'), nullable=False)
    class_id = Column(String, nullable=False)
    room_id = Column(String, nullable=False)
