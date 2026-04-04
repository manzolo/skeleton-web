from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Product

router = APIRouter()


class ProductCreate(BaseModel):
    name: str = Field(description="Product name", json_schema_extra={"example": "Widget"})
    description: str | None = Field(default=None, json_schema_extra={"example": "A useful widget"})
    price: Decimal = Field(description="Price with up to 2 decimal places", json_schema_extra={"example": 9.99})
    stock: int = Field(default=0, description="Units in stock", json_schema_extra={"example": 100})


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    price: Decimal
    stock: int
    created_at: datetime


@router.get("/", response_model=list[ProductRead])
async def list_products(db: AsyncSession = Depends(get_db)) -> list[Product]:
    """Return all products ordered by name."""
    result = await db.execute(select(Product).order_by(Product.name))
    return list(result.scalars().all())


@router.post("/", response_model=ProductRead, status_code=201)
async def create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db)) -> Product:
    """Create a new product."""
    product = Product(**payload.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)) -> Product:
    """Return a single product by ID. 404 if not found."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product
