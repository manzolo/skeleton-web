import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Permission, Role, role_permissions
from ..schemas import RoleCreate, RoleRead

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[RoleRead])
async def list_roles(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[Role]:
    """Return all roles with their assigned permissions."""
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).order_by(Role.name).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


@router.post("/", response_model=RoleRead, status_code=201)
async def create_role(
    payload: RoleCreate, db: AsyncSession = Depends(get_db)
) -> Role:
    """Create a new role. Name and slug must be unique."""
    role = Role(**payload.model_dump())
    db.add(role)
    logger.info("Creating role %s", payload.slug)
    try:
        await db.flush()
        await db.refresh(role, ["permissions"])
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A role with this name or slug already exists.")
    return role


@router.post("/{role_id}/permissions/{permission_id}", status_code=204)
async def assign_permission(
    role_id: int, permission_id: int, db: AsyncSession = Depends(get_db)
) -> Response:
    """Assign an existing permission to a role. Idempotent: safe to call multiple times."""
    role = await db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    permission = await db.get(Permission, permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found.")

    # Check if already assigned
    existing = await db.execute(
        select(role_permissions).where(
            role_permissions.c.role_id == role_id,
            role_permissions.c.permission_id == permission_id,
        )
    )
    if not existing.first():
        await db.execute(
            insert(role_permissions).values(role_id=role_id, permission_id=permission_id)
        )

    return Response(status_code=204)
