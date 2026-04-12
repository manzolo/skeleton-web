"""
Initial seed: creates base permissions, admin role, and admin user.
Idempotent: safe to run multiple times.

Admin credentials:
  username : admin
  email    : admin@example.com
  password : ADMIN_PASSWORD env var (default: changeme)

CHANGE THE PASSWORD IN PRODUCTION via ADMIN_PASSWORD in .env

────────────────────────────────────────────────────────────────────────────
Private seed data (gitignored)
────────────────────────────────────────────────────────────────────────────
Projects built from this template often need to pre-load domain-specific
data that shouldn't be committed (personally identifiable info, pricing,
internal configuration, etc.).

Pattern: create `backend/private_seed.py` (listed in .gitignore).
Implement a single async function `seed(db: AsyncSession) -> None` there.
It will be imported and called automatically after the standard seed runs.

Example backend/private_seed.py:
    from sqlalchemy.ext.asyncio import AsyncSession
    from src.models import SomeModel

    async def seed(db: AsyncSession) -> None:
        db.add(SomeModel(name="Internal record"))
        # no commit needed — caller commits
"""

import asyncio
import os

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import AsyncSessionLocal
from .models import Permission, Role, User, role_permissions
from .security import hash_password

ADMIN_EMAIL = "admin@example.com"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")

BASE_PERMISSIONS = [
    ("Can view users", "users.view"),
    ("Can edit users", "users.edit"),
    ("Can delete users", "users.delete"),
    ("Can manage roles", "roles.manage"),
]


async def _seed(db: AsyncSession) -> None:
    """Core seed logic — operates on the given session."""
    # 1. Create base permissions (skip if already exist)
    perms: dict[str, Permission] = {}
    for name, codename in BASE_PERMISSIONS:
        result = await db.execute(
            select(Permission).where(Permission.codename == codename)
        )
        perm = result.scalar_one_or_none()
        if not perm:
            perm = Permission(name=name, codename=codename)
            db.add(perm)
            await db.flush()
        perms[codename] = perm

    # 2. Create admin role (skip if already exists)
    result = await db.execute(select(Role).where(Role.slug == "admin"))
    role = result.scalar_one_or_none()
    if not role:
        role = Role(name="Administrator", slug="admin")
        db.add(role)
        await db.flush()
        # Assign all base permissions to admin role
        for perm in perms.values():
            await db.execute(
                insert(role_permissions).values(
                    role_id=role.id, permission_id=perm.id
                )
            )

    # 3. Create admin user (skip if already exists)
    result = await db.execute(select(User).where(User.username == ADMIN_USERNAME))
    if not result.scalar_one_or_none():
        admin = User(
            email=ADMIN_EMAIL,
            username=ADMIN_USERNAME,
            password_hash=hash_password(ADMIN_PASSWORD),
            is_active=True,
            role_id=role.id,
        )
        db.add(admin)

    # Optional: run private seed from gitignored backend/private_seed.py
    try:
        from private_seed import seed as private_seed  # type: ignore[import]
        await private_seed(db)
        print("[seed] private_seed.py applied")
    except ModuleNotFoundError:
        pass  # not present — skip silently

    await db.commit()
    print(f"[seed] Done — admin: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")


async def run(db: AsyncSession | None = None) -> None:
    """Run the seed. If *db* is provided the caller's session is used (useful in
    tests); otherwise a new session is opened from AsyncSessionLocal."""
    if db is not None:
        await _seed(db)
    else:
        async with AsyncSessionLocal() as _db:
            await _seed(_db)


if __name__ == "__main__":
    asyncio.run(run())
