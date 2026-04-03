from datetime import timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.security import create_access_token
from src.config import get_settings

pytestmark = pytest.mark.asyncio(loop_scope="session")

settings = get_settings()


async def _create_user(client: AsyncClient, username: str, password: str, active: bool = True) -> dict:
    res = await client.post("/users/", json={
        "email": f"{username}@test.com",
        "username": username,
        "password": password,
    })
    assert res.status_code == 201
    if not active:
        # patch is_active via DB — for now just return and let the test skip inactive check
        pass
    return res.json()


async def test_login_success(client: AsyncClient, db_session: AsyncSession):
    await _create_user(client, "alice", "secret")
    res = await client.post("/auth/login", json={"username": "alice", "password": "secret"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient):
    await _create_user(client, "bob", "correct")
    res = await client.post("/auth/login", json={"username": "bob", "password": "wrong"})
    assert res.status_code == 401


async def test_login_unknown_user(client: AsyncClient):
    res = await client.post("/auth/login", json={"username": "nobody", "password": "x"})
    assert res.status_code == 401


async def test_login_inactive_user(client: AsyncClient, db_session: AsyncSession):
    from sqlalchemy import select
    from src.models import User

    await _create_user(client, "inactive", "pass")
    result = await db_session.execute(select(User).where(User.username == "inactive"))
    user = result.scalar_one()
    user.is_active = False
    await db_session.commit()

    res = await client.post("/auth/login", json={"username": "inactive", "password": "pass"})
    assert res.status_code == 401


async def test_me_with_valid_token(client: AsyncClient):
    await _create_user(client, "charlie", "pass")
    token = (await client.post("/auth/login", json={"username": "charlie", "password": "pass"})).json()["access_token"]
    res = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["username"] == "charlie"


async def test_me_without_token(client: AsyncClient):
    res = await client.get("/auth/me")
    assert res.status_code == 401


async def test_me_with_invalid_token(client: AsyncClient):
    res = await client.get("/auth/me", headers={"Authorization": "Bearer not.a.token"})
    assert res.status_code == 401


async def test_me_with_expired_token(client: AsyncClient):
    await _create_user(client, "dave", "pass")
    expired = create_access_token("dave", settings.secret_key, expires_delta=timedelta(seconds=-1))
    res = await client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert res.status_code == 401


async def test_me_returns_role_and_permissions(client: AsyncClient):
    perm = (await client.post("/permissions/", json={"name": "Can edit", "codename": "edit"})).json()
    role = (await client.post("/roles/", json={"name": "Admin", "slug": "admin"})).json()
    await client.post(f"/roles/{role['id']}/permissions/{perm['id']}")
    await client.post("/users/", json={
        "email": "eve@test.com", "username": "eve", "password": "pass", "role_id": role["id"]
    })
    token = (await client.post("/auth/login", json={"username": "eve", "password": "pass"})).json()["access_token"]
    res = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"]["slug"] == "admin"
    assert any(p["codename"] == "edit" for p in data["role"]["permissions"])
