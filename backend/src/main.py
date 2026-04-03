from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html
from fastapi.responses import HTMLResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .database import get_db
from .routers import auth, permissions, roles, users

settings = get_settings()

_version_file = Path(__file__).resolve().parents[1] / "VERSION"
_APP_VERSION = _version_file.read_text().strip() if _version_file.exists() else "0.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="skeleton-web API",
    version=_APP_VERSION,
    redoc_url=None,  # disabled — served manually below with pinned JS version
    description="""
API for the **skeleton-web** template.

## Default admin credentials
- **Username**: `admin`
- **Password**: `changeme` — **change in production** via `ADMIN_PASSWORD` in `.env`

## Patterns demonstrated
- Simple FK (User → Role)
- Many-to-many (Role ↔ Permission) with association table
- Two-level nested response (User → Role → [Permission])

## Authentication
JWT via `POST /auth/login` → `Bearer <token>`. Use the **Authorize** button above to test protected endpoints.
    """,
    contact={"name": "skeleton-web", "url": "https://github.com/manzolo/skeleton-web"},
    license_info={"name": "MIT"},
    debug=settings.app_debug,
    lifespan=lifespan,
)

@app.get("/redoc", include_in_schema=False)
async def redoc() -> HTMLResponse:
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} — ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js",
        with_google_fonts=False,
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
app.include_router(roles.router, prefix="/roles", tags=["roles"])
app.include_router(users.router, prefix="/users", tags=["users"])


@app.get("/health", tags=["system"])
async def health(db: AsyncSession = Depends(get_db)) -> dict:
    """Check API and database connectivity."""
    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as _exc:
        import logging
        logging.getLogger(__name__).exception("health check DB error: %s", type(_exc).__name__)
        db_status = "degraded"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "env": settings.app_env,
    }
