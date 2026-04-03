import os
from pathlib import Path

import psycopg2
import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from src.database import get_db
from src.main import app
from src.models import Base

# Resolve paths relative to this file so both Docker (/app) and CI (backend/) work.
_ALEMBIC_INI = str(Path(__file__).parent.parent / "alembic.ini")

# Tests run against a dedicated test database — never touch the application DB.
_DB_HOST = os.environ.get("DB_HOST", "db")
_DB_USER = os.environ.get("DB_USER", "skeleton")
_DB_PASS = os.environ.get("DB_PASS", "changeme")
_DB_PORT = os.environ.get("DB_PORT", "5432")
_TEST_DB = os.environ.get("TEST_POSTGRES_DB", "skeletondb_test")

TEST_DATABASE_URL = f"postgresql+asyncpg://{_DB_USER}:{_DB_PASS}@{_DB_HOST}:{_DB_PORT}/{_TEST_DB}"
SYNC_DATABASE_URL = f"postgresql://{_DB_USER}:{_DB_PASS}@{_DB_HOST}:{_DB_PORT}/{_TEST_DB}"


def pytest_collection_modifyitems(items: list) -> None:
    """Force all async tests to use the session-scoped event loop."""
    session_scope_mark = pytest.mark.asyncio(loop_scope="session")
    for item in items:
        if isinstance(item, pytest.Function):
            item.add_marker(session_scope_mark, append=False)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Rebuild schema on the test database via real Alembic migrations.
    Always starts clean; does NOT run the seed (tests create their own data)."""
    os.environ["ALEMBIC_DATABASE_URL"] = SYNC_DATABASE_URL
    cfg = Config(_ALEMBIC_INI)
    command.downgrade(cfg, "base")  # clean up any partial state from a previous crashed run
    command.upgrade(cfg, "head")
    yield
    # No teardown downgrade — the test DB is dedicated, and the next run will
    # start with downgrade+upgrade anyway. Dropping here races with clean_tables.


@pytest.fixture(scope="session")
async def test_engine(setup_db):
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool, echo=False)
    yield engine
    await engine.dispose()


@pytest.fixture(scope="session")
async def session_factory(test_engine):
    return async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture
async def db_session(session_factory) -> AsyncSession:
    session = session_factory()
    try:
        yield session
    finally:
        await session.close()


@pytest.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clean_tables():
    """Truncate all tables after each test via synchronous psycopg2."""
    yield
    conn = psycopg2.connect(SYNC_DATABASE_URL)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            tables = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
            cur.execute(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE")
    finally:
        conn.close()
