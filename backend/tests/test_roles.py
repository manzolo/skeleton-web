import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Role

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_create_role_empty_permissions(client: AsyncClient, db_session: AsyncSession):
    res = await client.post("/roles/", json={"name": "Editor", "slug": "editor"})
    assert res.status_code == 201
    data = res.json()
    assert data["slug"] == "editor"
    assert data["permissions"] == []
    # verify in DB
    row = await db_session.get(Role, data["id"])
    assert row is not None
    assert row.name == "Editor"


async def test_assign_permission_to_role(client: AsyncClient):
    perm = (await client.post("/permissions/", json={"name": "Can edit", "codename": "edit"})).json()
    role = (await client.post("/roles/", json={"name": "Admin", "slug": "admin"})).json()
    res = await client.post(f"/roles/{role['id']}/permissions/{perm['id']}")
    assert res.status_code == 204
    # verify the role now has the permission
    roles = (await client.get("/roles/")).json()
    assert any(p["codename"] == "edit" for p in roles[0]["permissions"])


async def test_assign_permission_idempotent(client: AsyncClient):
    perm = (await client.post("/permissions/", json={"name": "Can edit", "codename": "edit"})).json()
    role = (await client.post("/roles/", json={"name": "Admin", "slug": "admin"})).json()
    await client.post(f"/roles/{role['id']}/permissions/{perm['id']}")
    res = await client.post(f"/roles/{role['id']}/permissions/{perm['id']}")
    assert res.status_code == 204  # must not fail on second call
