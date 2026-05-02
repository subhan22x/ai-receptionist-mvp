from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from .auth import AuthenticatedUser

ADMIN_ROLES = {"owner", "admin"}

BUSINESS_FIELDS = [
    "business_name",
    "industry",
    "timezone",
    "service_area",
    "business_address",
    "business_city",
    "business_state",
    "business_zip",
    "business_website",
    "business_phone",
    "notification_phone",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _first(rows: list[dict] | None) -> dict | None:
    return rows[0] if rows else None


def _default_full_name(user: AuthenticatedUser) -> str | None:
    metadata = user.user_metadata or {}
    value = (
        metadata.get("full_name")
        or metadata.get("name")
        or metadata.get("display_name")
    )
    return str(value) if value else None


def ensure_user_profile(
    supabase: Client,
    user: AuthenticatedUser,
    *,
    full_name: str | None = None,
    personal_phone: str | None = None,
) -> dict:
    payload = {
        "id": user.id,
        "email": user.email,
        "full_name": full_name or _default_full_name(user),
        "personal_phone": personal_phone,
        "updated_at": now_iso(),
    }
    existing = (
        supabase.table("user_profiles")
        .select("*")
        .eq("id", user.id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if existing:
        update_payload = {
            "email": user.email,
            "updated_at": payload["updated_at"],
        }
        if full_name is not None:
            update_payload["full_name"] = full_name
        elif not existing[0].get("full_name") and payload["full_name"]:
            update_payload["full_name"] = payload["full_name"]
        if personal_phone is not None:
            update_payload["personal_phone"] = personal_phone
        res = (
            supabase.table("user_profiles")
            .update(update_payload)
            .eq("id", user.id)
            .execute()
        )
    else:
        res = supabase.table("user_profiles").insert(payload).execute()

    profile = _first(res.data)
    if not profile:
        raise HTTPException(status_code=500, detail="Failed to save user profile")
    return profile


def list_user_businesses(supabase: Client, user_id: str) -> list[dict]:
    memberships = (
        supabase.table("business_users")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
        .data
        or []
    )
    if not memberships:
        return []

    business_ids = [row["business_id"] for row in memberships]
    businesses = (
        supabase.table("businesses")
        .select("*")
        .in_("id", business_ids)
        .execute()
        .data
        or []
    )
    by_id = {row["id"]: row for row in businesses}

    result: list[dict] = []
    for membership in memberships:
        business = by_id.get(membership["business_id"])
        if not business:
            continue
        result.append(
            {
                "id": business["id"],
                "business_name": business["business_name"],
                "industry": business.get("industry"),
                "timezone": business.get("timezone"),
                "role": membership["role"],
            }
        )
    return result


def get_business_membership(
    supabase: Client,
    user_id: str,
    business_id: str,
) -> dict | None:
    rows = (
        supabase.table("business_users")
        .select("*")
        .eq("user_id", user_id)
        .eq("business_id", business_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    return _first(rows)


def get_business_or_404(supabase: Client, business_id: str) -> dict:
    rows = (
        supabase.table("businesses")
        .select("*")
        .eq("id", business_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    business = _first(rows)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


def get_current_business(
    supabase: Client,
    user_id: str,
    business_id: str | None = None,
) -> tuple[dict, str]:
    businesses = list_user_businesses(supabase, user_id)

    if business_id:
        match = next((b for b in businesses if b["id"] == business_id), None)
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this business",
            )
        return get_business_or_404(supabase, business_id), match["role"]

    if not businesses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "onboarding_required", "message": "Create a business first"},
        )

    if len(businesses) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "business_selection_required",
                "message": "Select a business for this request",
            },
        )

    selected = businesses[0]
    return get_business_or_404(supabase, selected["id"]), selected["role"]


def require_admin_role(role: str) -> None:
    if role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner or admin access is required",
        )


def create_business_with_defaults(
    supabase: Client,
    user: AuthenticatedUser,
    payload: dict[str, Any],
) -> dict:
    ensure_user_profile(supabase, user)

    business_payload = {
        key: payload.get(key)
        for key in BUSINESS_FIELDS
        if key in payload
    }
    business_payload["business_name"] = str(business_payload.get("business_name") or "").strip()
    if not business_payload["business_name"]:
        raise HTTPException(status_code=422, detail="business_name is required")
    business_payload["timezone"] = business_payload.get("timezone") or "America/Chicago"
    business_payload["owner_user_id"] = user.id

    business_res = supabase.table("businesses").insert(business_payload).execute()
    business = _first(business_res.data)
    if not business:
        raise HTTPException(status_code=500, detail="Failed to create business")

    business_id = business["id"]
    try:
        supabase.table("business_users").insert(
            {"business_id": business_id, "user_id": user.id, "role": "owner"}
        ).execute()
        _create_default_business_rows(supabase, business_id, business)
    except Exception as exc:
        supabase.table("businesses").delete().eq("id", business_id).execute()
        raise HTTPException(
            status_code=500,
            detail="Failed to create default business settings",
        ) from exc

    return business


def _create_default_business_rows(
    supabase: Client,
    business_id: str,
    business: dict,
) -> None:
    notification_phone = business.get("notification_phone")
    supabase.table("booking_rules").insert({"business_id": business_id}).execute()
    supabase.table("ai_agents").insert(
        {
            "business_id": business_id,
            "greeting": f"{business['business_name']}, how can I help you today?",
            "base_instructions": "Answer calls, collect lead details, and help book appointments.",
        }
    ).execute()
    supabase.table("notification_preferences").insert(
        {
            "business_id": business_id,
            "notification_phone": notification_phone,
            "notification_email": None,
        }
    ).execute()

    hours = []
    for day in range(7):
        is_weekday = 1 <= day <= 5
        hours.append(
            {
                "business_id": business_id,
                "day_of_week": day,
                "open_time": "09:00" if is_weekday else None,
                "close_time": "17:00" if is_weekday else None,
                "is_closed": not is_weekday,
            }
        )
    supabase.table("business_hours").insert(hours).execute()

    starter_services = _starter_services_for_industry(business.get("industry"))
    if starter_services:
        supabase.table("services").insert(
            [
                {
                    "business_id": business_id,
                    **service,
                }
                for service in starter_services
            ]
        ).execute()


def _starter_services_for_industry(industry: str | None) -> list[dict]:
    normalized = (industry or "").lower()
    if "electric" in normalized:
        names = ["Electrical repair", "Panel inspection", "Emergency outage help"]
    elif "hvac" in normalized or "heating" in normalized or "air" in normalized:
        names = ["HVAC repair", "System tune-up", "Emergency no-heat/no-cool"]
    elif "clean" in normalized:
        names = ["Standard cleaning", "Deep cleaning", "Move-out cleaning"]
    elif "roof" in normalized:
        names = ["Roof repair", "Leak inspection", "Emergency tarp service"]
    else:
        names = ["Service appointment", "Emergency service", "Estimate request"]

    return [
        {
            "name": name,
            "category": "Default",
            "is_emergency_service": "Emergency" in name,
        }
        for name in names
    ]


def update_business(
    supabase: Client,
    business_id: str,
    payload: dict[str, Any],
) -> dict:
    update_payload = {
        key: payload[key]
        for key in BUSINESS_FIELDS
        if key in payload
    }
    if "business_name" in update_payload:
        update_payload["business_name"] = str(update_payload["business_name"] or "").strip()
        if not update_payload["business_name"]:
            raise HTTPException(status_code=422, detail="business_name is required")

    if not update_payload:
        return get_business_or_404(supabase, business_id)

    update_payload["updated_at"] = now_iso()
    res = (
        supabase.table("businesses")
        .update(update_payload)
        .eq("id", business_id)
        .execute()
    )
    business = _first(res.data)
    if not business:
        raise HTTPException(status_code=500, detail="Failed to update business")
    return business


def get_business_settings(supabase: Client, business_id: str) -> dict:
    business = get_business_or_404(supabase, business_id)
    services = (
        supabase.table("services")
        .select("*")
        .eq("business_id", business_id)
        .order("created_at")
        .execute()
        .data
        or []
    )
    business_hours = (
        supabase.table("business_hours")
        .select("*")
        .eq("business_id", business_id)
        .order("day_of_week")
        .execute()
        .data
        or []
    )
    booking_rules = _first(
        supabase.table("booking_rules")
        .select("*")
        .eq("business_id", business_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    ai_agent = _first(
        supabase.table("ai_agents")
        .select("*")
        .eq("business_id", business_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    notification_preferences = _first(
        supabase.table("notification_preferences")
        .select("*")
        .eq("business_id", business_id)
        .limit(1)
        .execute()
        .data
        or []
    )

    return {
        "business": business,
        "services": services,
        "business_hours": business_hours,
        "booking_rules": booking_rules,
        "ai_agent": ai_agent,
        "notification_preferences": notification_preferences,
    }
