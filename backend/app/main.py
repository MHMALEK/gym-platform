from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import (
    ai_coach_chat,
    ai_workout,
    auth,
    billing,
    client_portal,
    clients,
    coach_site,
    dashboard,
    demo,
    directory,
    exercise_media,
    exercises,
    invoices,
    mcp,
    me,
    media,
    nutrition_templates,
    plan_templates,
    public_site,
    training_plans,
)
from app.core.config import settings
from app.core.security import init_firebase


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    settings.media_upload_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

v1 = settings.api_v1_prefix
app.include_router(auth.router, prefix=v1)
app.include_router(client_portal.router, prefix=v1)
app.include_router(dashboard.router, prefix=v1)
app.include_router(me.router, prefix=v1)
app.include_router(coach_site.router, prefix=v1)
app.include_router(public_site.router, prefix=v1)
app.include_router(directory.router, prefix=v1)
app.include_router(exercises.router, prefix=v1)
app.include_router(exercise_media.router, prefix=v1)
app.include_router(media.router, prefix=v1)
app.include_router(training_plans.router, prefix=v1)
app.include_router(ai_workout.router, prefix=v1)
app.include_router(ai_coach_chat.router, prefix=v1)
app.include_router(mcp.router, prefix=v1)
app.include_router(nutrition_templates.router, prefix=v1)
app.include_router(clients.router, prefix=v1)
app.include_router(demo.router, prefix=v1)
app.include_router(invoices.router, prefix=v1)
app.include_router(billing.router, prefix=v1)
app.include_router(plan_templates.router, prefix=v1)

settings.media_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    "/uploads",
    StaticFiles(directory=str(settings.media_upload_dir.resolve())),
    name="uploads",
)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Built coach/client web app. Present after `npm run build` copies frontend/dist here.
_spa_dir = Path(__file__).resolve().parent.parent / "spa"
if (_spa_dir / "index.html").is_file():
    try:
        # Vercel promotes this mount to the CDN. Local FastAPI has no frontend().
        app.frontend("/", directory=str(_spa_dir), fallback="index.html")
    except AttributeError:
        _assets_dir = _spa_dir / "assets"
        if _assets_dir.is_dir():
            app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="spa-assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def spa_fallback(full_path: str):
            root = _spa_dir.resolve()
            candidate = (root / full_path).resolve()
            if candidate.is_file() and str(candidate).startswith(str(root)):
                return FileResponse(candidate)
            return FileResponse(root / "index.html")
