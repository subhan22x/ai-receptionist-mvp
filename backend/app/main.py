import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api_routes import router
from .config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="AI Receptionist MVP", version="0.1.0")

    allowed_origins = ["http://localhost:5173"]
    if settings.frontend_url and settings.frontend_url not in allowed_origins:
        allowed_origins.append(settings.frontend_url)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return {
            "status": "ok",
            "supabase_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
            "openai_configured": bool(settings.openai_api_key),
            "model": settings.openai_realtime_model,
        }

    app.include_router(router, prefix="/api")

    frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if frontend_dist.exists():
        app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
        logger.info("Serving frontend assets from %s", frontend_dist)
    else:
        logger.warning("Frontend build directory not found at %s", frontend_dist)

    logger.info("FastAPI app initialized. Frontend origin: %s", settings.frontend_url)
    return app


app = create_app()
