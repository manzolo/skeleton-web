import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Permission

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_create_permission(client: AsyncClient, db_session: AsyncSession):
    res = await client.post("/permissions/", json={"name": "Can edit", "codename": "articles.edit"})
    assert res.status_code == 201
    data = res.json()
    assert data["codename"] == "articles.edit"
    assert data["id"] > 0
    # verify directly in DB
    row = await db_session.get(Permission, data["id"])
    assert row is not None
    assert row.name == "Can edit"


async def test_duplicate_codename_returns_409(client: AsyncClient):
    await client.post("/permissions/", json={"name": "Can edit", "codename": "articles.edit"})
    res = await client.post("/permissions/", json={"name": "Other", "codename": "articles.edit"})
    assert res.status_code == 409


async def test_list_permissions_empty(client: AsyncClient):
    res = await client.get("/permissions/")
    assert res.status_code == 200
    assert res.json() == []
