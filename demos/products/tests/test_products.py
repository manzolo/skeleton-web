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


async def test_update_product(client: AsyncClient):
    created = (await client.post("/products/", json={
        "name": "OldName", "price": "5.00", "stock": 10,
    })).json()
    res = await client.put(f"/products/{created['id']}", json={
        "name": "NewName", "price": "7.50", "stock": 20,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "NewName"
    assert data["stock"] == 20
    assert data["id"] == created["id"]


async def test_update_product_404(client: AsyncClient):
    res = await client.put("/products/9999", json={"name": "X", "price": "1.00"})
    assert res.status_code == 404


async def test_delete_product(client: AsyncClient):
    created = (await client.post("/products/", json={
        "name": "ToDelete", "price": "1.00",
    })).json()
    res = await client.delete(f"/products/{created['id']}")
    assert res.status_code == 204
    # confirm gone
    res = await client.get(f"/products/{created['id']}")
    assert res.status_code == 404


async def test_delete_product_404(client: AsyncClient):
    res = await client.delete("/products/9999")
    assert res.status_code == 404
