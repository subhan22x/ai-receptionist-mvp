import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

    allowed_origins = [settings.frontend_url]
    if settings.frontend_url != "http://localhost:5173":
        allowed_origins.append("http://localhost:5173")

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
    logger.info("FastAPI app initialized. Frontend origin: %s", settings.frontend_url)
    return app


app = create_app()
