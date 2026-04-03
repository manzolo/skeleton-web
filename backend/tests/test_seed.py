import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import User
from src.seed import run as seed_run

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_seed_creates_admin_with_role_and_permissions(db_session: AsyncSession):
    await seed_run(db=db_session)
    result = await db_session.execute(select(User).where(User.username == "admin"))
    admin = result.scalar_one()
    assert admin.is_active
    assert admin.email == "admin@example.com"
    assert admin.password_hash is not None
    assert admin.password_hash != "changeme"
    # reload with relationships
    await db_session.refresh(admin, ["role"])
    assert admin.role is not None
    assert admin.role.slug == "admin"
    await db_session.refresh(admin.role, ["permissions"])
    assert len(admin.role.permissions) == 4


async def test_seed_is_idempotent(db_session: AsyncSession):
    await seed_run(db=db_session)
    await seed_run(db=db_session)  # must not raise or create duplicates
    result = await db_session.execute(select(User).where(User.username == "admin"))
    assert len(result.scalars().all()) == 1
