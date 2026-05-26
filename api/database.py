from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from api.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {}
if is_sqlite:
    connect_args = {"check_same_thread": False}

engine_args = {
    "pool_pre_ping": True,
}
if connect_args:
    engine_args["connect_args"] = connect_args

if not is_sqlite:
    engine_args["pool_size"] = 5
    engine_args["max_overflow"] = 10

engine = create_engine(
    settings.DATABASE_URL,
    **engine_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
