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

TEST_DATABASE_URL = "postgresql+asyncpg://skeleton:changeme@db:5432/skeletondb"
SYNC_DATABASE_URL = "postgresql://skeleton:changeme@db:5432/skeletondb"


def pytest_collection_modifyitems(items: list) -> None:
    """Force all async tests to use the session-scoped event loop.

    This must match asyncio_default_fixture_loop_scope so that tests and fixtures
    share the same event loop — required to avoid asyncpg 'Future attached to a
    different loop' errors when connections are created during test execution and
    then closed in fixture teardown.
    """
    session_scope_mark = pytest.mark.asyncio(loop_scope="session")
    for item in items:
        if isinstance(item, pytest.Function):
            item.add_marker(session_scope_mark, append=False)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Rebuild schema via real Alembic migrations (synchronous — Alembic uses psycopg2).
    Always starts from a clean state to avoid residue from crashed previous runs.
    Does NOT run the seed: tests create their own data."""
    cfg = Config("/app/alembic.ini")
    command.downgrade(cfg, "base")  # drop all tables (no-op on a fresh DB)
    command.upgrade(cfg, "head")
    yield
    command.downgrade(cfg, "base")


@pytest.fixture(scope="session")
async def test_engine(setup_db):
    """Session-scoped async engine. NullPool prevents connection sharing between tests."""
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool, echo=False)
    yield engine
    await engine.dispose()


@pytest.fixture(scope="session")
async def session_factory(test_engine):
    return async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture
async def db_session(session_factory) -> AsyncSession:
    """Explicit session lifecycle avoids asyncio.shield() in AsyncSession.__aexit__
    which can cause cross-loop errors when teardown runs between loop iterations."""
    session = session_factory()
    try:
        yield session
    finally:
        # Use explicit close() which does not go through asyncio.shield()
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
    """Truncate all data after each test via synchronous psycopg2."""
    yield
    conn = psycopg2.connect(SYNC_DATABASE_URL)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            tables = ", ".join(
                t.name for t in reversed(Base.metadata.sorted_tables)
            )
            cur.execute(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE")
    finally:
        conn.close()
