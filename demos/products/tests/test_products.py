import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_list_products_empty(client: AsyncClient):
    res = await client.get("/products/")
    assert res.status_code == 200
    assert res.json() == []


async def test_create_product(client: AsyncClient):
    res = await client.post("/products/", json={
        "name": "Widget",
        "description": "A useful widget",
        "price": "9.99",
        "stock": 100,
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Widget"
    assert data["stock"] == 100
    assert "id" in data
    assert "created_at" in data


async def test_get_product(client: AsyncClient):
    created = (await client.post("/products/", json={
        "name": "Gadget", "price": "19.99",
    })).json()
    res = await client.get(f"/products/{created['id']}")
    assert res.status_code == 200
    assert res.json()["name"] == "Gadget"


async def test_get_product_404(client: AsyncClient):
    res = await client.get("/products/9999")
    assert res.status_code == 404


async def test_create_product_missing_required_field(client: AsyncClient):
    res = await client.post("/products/", json={"name": "NoPrice"})
    assert res.status_code == 422
