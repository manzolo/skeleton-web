from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PermissionCreate(BaseModel):
    name: str = Field(description="Human-readable permission name", example="Can edit articles")
    codename: str = Field(
        description="Unique identifier in slug.action format", example="articles.edit"
    )


class PermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    codename: str


class RoleCreate(BaseModel):
    name: str = Field(description="Role display name", example="Editor")
    slug: str = Field(description="URL-safe unique identifier", example="editor")


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    permissions: list[PermissionRead] = Field(
        default=[], description="Permissions assigned to this role"
    )


class UserCreate(BaseModel):
    email: EmailStr = Field(description="Unique email address", example="alice@example.com")
    username: str = Field(description="Unique username", example="alice")
    password: str | None = Field(
        default=None, description="Plain-text password — will be hashed before storage"
    )
    role_id: int | None = Field(default=None, description="Role ID to assign (optional)")


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    is_active: bool
    created_at: datetime
    role: RoleRead | None = Field(
        description="Role with permissions, null if not assigned"
    )
    # password_hash is intentionally not exposed
