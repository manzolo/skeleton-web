import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import User

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_create_user_without_role(client: AsyncClient, db_session: AsyncSession):
    res = await client.post("/users/", json={"email": "alice@test.com", "username": "alice"})
    assert res.status_code == 201
    data = res.json()
    assert data["role"] is None
    assert "password_hash" not in data
    # verify in DB
    row = await db_session.get(User, data["id"])
    assert row is not None
    assert row.email == "alice@test.com"


async def test_create_user_with_role_and_permissions(client: AsyncClient, db_session: AsyncSession):
    perm = (await client.post("/permissions/", json={"name": "Can edit", "codename": "edit"})).json()
    role = (await client.post("/roles/", json={"name": "Admin", "slug": "admin"})).json()
    await client.post(f"/roles/{role['id']}/permissions/{perm['id']}")

    res = await client.post(
        "/users/", json={"email": "bob@test.com", "username": "bob", "role_id": role["id"]}
    )
    assert res.status_code == 201
    data = res.json()
    # nested response: user → role → permissions
    assert data["role"]["slug"] == "admin"
    assert data["role"]["permissions"][0]["codename"] == "edit"
    # verify FK in DB
    row = await db_session.get(User, data["id"])
    assert row.role_id == role["id"]


async def test_create_user_with_password(client: AsyncClient, db_session: AsyncSession):
    res = await client.post(
        "/users/", json={"email": "charlie@test.com", "username": "charlie", "password": "secret"}
    )
    assert res.status_code == 201
    # verify password is hashed in DB, not stored in plain text
    row = await db_session.get(User, res.json()["id"])
    assert row.password_hash is not None
    assert row.password_hash != "secret"


async def test_get_user_404(client: AsyncClient):
    res = await client.get("/users/9999")
    assert res.status_code == 404


async def test_list_users(client: AsyncClient):
    role = (await client.post("/roles/", json={"name": "Editor", "slug": "editor"})).json()
    await client.post(
        "/users/", json={"email": "c@test.com", "username": "charlie", "role_id": role["id"]}
    )
    await client.post("/users/", json={"email": "d@test.com", "username": "dave"})
    users = (await client.get("/users/")).json()
    assert len(users) == 2
    # ordered by username: charlie < dave
    assert users[0]["role"]["slug"] == "editor"
    assert users[1]["role"] is None
