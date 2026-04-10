from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, clients, dashboard, directory, exercises, invoices, me, plan_templates, training_plans
from app.core.config import settings
from app.core.security import init_firebase


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
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
app.include_router(training_plans.router, prefix=v1)
app.include_router(clients.router, prefix=v1)
app.include_router(invoices.router, prefix=v1)
app.include_router(plan_templates.router, prefix=v1)


@app.get("/health")
async def health():
    return {"status": "ok"}
