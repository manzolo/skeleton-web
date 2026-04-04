import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Permission
from ..schemas import PermissionCreate, PermissionRead

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[PermissionRead])
async def list_permissions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[Permission]:
    """Return all permissions registered in the system."""
    result = await db.execute(
        select(Permission).order_by(Permission.codename).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


@router.post("/", response_model=PermissionRead, status_code=201)
async def create_permission(
    payload: PermissionCreate, db: AsyncSession = Depends(get_db)
) -> Permission:
    """Create a new permission. The codename must be unique (e.g. 'articles.edit')."""
    permission = Permission(**payload.model_dump())
    db.add(permission)
    logger.info("Creating permission %s", payload.codename)
    try:
        await db.flush()
        await db.refresh(permission)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A permission with this codename already exists.")
    return permission
