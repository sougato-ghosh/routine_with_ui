import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
from dotenv import load_dotenv
load_dotenv() 
# Get Database URL from environment or default to local SQLite
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,     #checks if connection is alive before using it
    pool_recycle=1800,      # recycle connections after 30 minutes to prevent stale connections
    pool_timeout=30,        # wait up to 30 seconds for a connection from the pool
    pool_size=5,            # number of connections to keep in the pool
    max_overflow=10,        # number of connections to allow in overflow (beyond pool_size)
    echo=False,             # set to True for SQL query logging, False for production
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()