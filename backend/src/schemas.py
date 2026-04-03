from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PermissionCreate(BaseModel):
    name: str = Field(
        description="Human-readable permission name",
        json_schema_extra={"example": "Can edit articles"},
    )
    codename: str = Field(
        description="Unique identifier in slug.action format",
        json_schema_extra={"example": "articles.edit"},
    )


class PermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    codename: str


class RoleCreate(BaseModel):
    name: str = Field(
        description="Role display name",
        json_schema_extra={"example": "Editor"},
    )
    slug: str = Field(
        description="URL-safe unique identifier",
        json_schema_extra={"example": "editor"},
    )


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    permissions: list[PermissionRead] = Field(
        default=[], description="Permissions assigned to this role"
    )


class UserCreate(BaseModel):
    email: EmailStr = Field(
        description="Unique email address",
        json_schema_extra={"example": "alice@example.com"},
    )
    username: str = Field(
        description="Unique username",
        json_schema_extra={"example": "alice"},
    )
    password: str | None = Field(
        default=None, description="Plain-text password — will be hashed before storage"
    )
    role_id: int | None = Field(default=None, description="Role ID to assign (optional)")


class LoginRequest(BaseModel):
    username: str = Field(
        description="Account username",
        json_schema_extra={"example": "admin"},
    )
    password: str = Field(
        description="Plain-text password",
        json_schema_extra={"example": "changeme"},
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


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
