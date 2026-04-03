from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Role, User
from ..schemas import UserCreate, UserRead
from ..security import hash_password

router = APIRouter()

_user_load = [selectinload(User.role).selectinload(Role.permissions)]


@router.get("/", response_model=list[UserRead])
async def list_users(db: AsyncSession = Depends(get_db)) -> list[User]:
    """Return all users with their role and permissions."""
    result = await db.execute(
        select(User).options(*_user_load).order_by(User.username)
    )
    return list(result.scalars().all())


@router.post("/", response_model=UserRead, status_code=201)
async def create_user(
    payload: UserCreate, db: AsyncSession = Depends(get_db)
) -> User:
    """Create a new user. Email and username must be unique. Password is hashed before storage."""
    data = payload.model_dump(exclude={"password"})
    if payload.password:
        data["password_hash"] = hash_password(payload.password)
    user = User(**data)
    db.add(user)
    try:
        await db.flush()
        await db.refresh(user, ["role"])
        if user.role:
            await db.refresh(user.role, ["permissions"])
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A user with this email or username already exists.")
    return user


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)) -> User:
    """Return a single user with role and permissions. 404 if not found."""
    result = await db.execute(
        select(User).where(User.id == user_id).options(*_user_load)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user
