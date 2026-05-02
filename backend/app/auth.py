from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, Request, status

from .db import get_supabase


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str | None = None
    user_metadata: dict[str, Any] | None = None


def _value(obj: Any, key: str, default: Any = None) -> Any:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _extract_bearer_token(request: Request) -> str:
    header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expected Authorization Bearer token",
        )
    return token.strip()


def get_current_user(request: Request) -> AuthenticatedUser:
    token = _extract_bearer_token(request)
    supabase = get_supabase()

    try:
        auth_response = supabase.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        ) from exc

    user = _value(auth_response, "user")
    user_id = _value(user, "id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    metadata = (
        _value(user, "user_metadata")
        or _value(user, "raw_user_meta_data")
        or {}
    )
    if not isinstance(metadata, dict):
        metadata = {}

    return AuthenticatedUser(
        id=str(user_id),
        email=_value(user, "email"),
        user_metadata=metadata,
    )
