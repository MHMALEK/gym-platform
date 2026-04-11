from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import (
    auth,
    billing,
    clients,
    dashboard,
    directory,
    exercise_media,
    exercises,
    invoices,
    me,
    media,
    nutrition_templates,
    plan_templates,
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
app.include_router(dashboard.router, prefix=v1)
app.include_router(me.router, prefix=v1)
app.include_router(directory.router, prefix=v1)
app.include_router(exercises.router, prefix=v1)
app.include_router(exercise_media.router, prefix=v1)
app.include_router(media.router, prefix=v1)
app.include_router(training_plans.router, prefix=v1)
app.include_router(nutrition_templates.router, prefix=v1)
app.include_router(clients.router, prefix=v1)
app.include_router(invoices.router, prefix=v1)
app.include_router(billing.router, prefix=v1)
app.include_router(plan_templates.router, prefix=v1)

app.mount(
    "/uploads",
    StaticFiles(directory=str(settings.media_upload_dir.resolve())),
    name="uploads",
)


@app.get("/health")
async def health():
    return {"status": "ok"}
