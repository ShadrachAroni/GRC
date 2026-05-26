import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from api.database import Base, get_db
from api.main import app
from api.limiter import limiter

# Disable rate limiting for testing
limiter.enabled = False

# Local SQLite test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_grcdb.db"

# Use NullPool to prevent connection pooling and table-locking in SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=NullPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", autouse=True)
def setup_db():
    # Setup test tables
    Base.metadata.create_all(bind=engine)
    yield
    # Teardown test tables cleanly
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
