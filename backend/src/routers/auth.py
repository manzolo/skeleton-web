from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..config import get_settings
from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, TokenResponse, UserRead
from ..security import create_access_token, get_current_user, verify_password

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Validate credentials and return a JWT access token.

    Returns 401 if the username does not exist, the password is wrong,
    or the account is inactive.
    """
    result = await db.execute(
        select(User).where(or_(User.username == payload.username, User.email == payload.username))
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.password_hash or "") or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.username, get_settings().secret_key)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserRead)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Return the authenticated user with role and permissions eager-loaded."""
    result = await db.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.role).selectinload(User.role.property.mapper.class_.permissions))
    )
    return result.scalar_one()
