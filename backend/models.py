from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Teacher(Base):
    __tablename__ = 'teachers'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    teacher_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
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
    subject_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    duration = Column(Integer, default=1)
    required_room_type = Column(String)
    viable_rooms = Column(String) # Comma-separated list of room IDs
    is_optional = Column(Boolean, default=False)

class Timeslot(Base):
    __tablename__ = 'timeslots'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    day = Column(Integer, nullable=False)
    period = Column(Integer, nullable=False)

class Curriculum(Base):
    __tablename__ = 'curriculum'
    id = Column(Integer, primary_key=True)
    user_id = Column(String, default="default_user")
    class_id = Column(String, nullable=False)
    subject_id = Column(String, nullable=False)
    teacher_id = Column(String, nullable=False)
    periods_per_week = Column(Integer, default=1)
    room_id = Column(String) # Optional fixed room

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
