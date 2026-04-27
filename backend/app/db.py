import logging
from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in the backend environment."
        )
    logger.info("Initializing Supabase client for %s", settings.supabase_url)
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
