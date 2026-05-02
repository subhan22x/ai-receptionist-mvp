import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, status

from .accounts import (
    create_business_with_defaults,
    ensure_user_profile,
    get_business_settings,
    get_current_business,
    list_user_businesses,
    require_admin_role,
    update_business,
)
from .auth import get_current_user
from .db import get_supabase
from .realtime_session import create_ephemeral_session
from .scheduling import create_appointment_with_conflict_check
from .schemas import (
    Appointment,
    AppointmentBookResult,
    AppointmentCreate,
    Business,
    BusinessCreate,
    BusinessSettingsResponse,
    BusinessSummary,
    BusinessUpdate,
    Call,
    CallCreate,
    CurrentUserProfile,
    Customer,
    CustomerCreate,
    DashboardResponse,
    MeResponse,
    UserProfileUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _scope_business(query, business_id: str | None):
    if business_id is None:
        return query.is_("business_id", "null")
    return query.eq("business_id", business_id)


def _profile_response(profile: dict) -> dict:
    return {
        "id": profile["id"],
        "email": profile.get("email"),
        "full_name": profile.get("full_name"),
        "personal_phone": profile.get("personal_phone"),
    }


def _get_dashboard_for_business(business_id: str | None) -> DashboardResponse:
    supabase = get_supabase()

    customers = (
        _scope_business(
            supabase.table("customers")
            .select("*")
            .order("created_at", desc=True)
            .limit(10),
            business_id,
        )
        .execute()
        .data
        or []
    )

    appointments = (
        _scope_business(
            supabase.table("appointments")
            .select("*")
            .order("appointment_date")
            .order("start_time")
            .limit(100),
            business_id,
        )
        .execute()
        .data
        or []
    )

    calls = (
        _scope_business(
            supabase.table("calls")
            .select("*")
            .order("created_at", desc=True)
            .limit(10),
            business_id,
        )
        .execute()
        .data
        or []
    )

    latest_appointment: Optional[dict] = None
    if appointments:
        latest_appointment = sorted(
            appointments, key=lambda a: a.get("created_at") or "", reverse=True
        )[0]

    return DashboardResponse(
        latest_customer=customers[0] if customers else None,
        latest_appointment=latest_appointment,
        latest_call=calls[0] if calls else None,
        recent_calls=calls,
        recent_customers=customers,
        appointments=appointments,
    )


def _verify_customer_access(
    customer_id: str | None,
    business_id: str | None,
) -> None:
    if not customer_id:
        return
    supabase = get_supabase()
    rows = (
        supabase.table("customers")
        .select("id,business_id")
        .eq("id", customer_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    if rows[0].get("business_id") != business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer does not belong to this business",
        )


def _verify_appointment_access(
    appointment_id: str | None,
    business_id: str | None,
) -> None:
    if not appointment_id:
        return
    supabase = get_supabase()
    rows = (
        supabase.table("appointments")
        .select("id,business_id")
        .eq("id", appointment_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    if rows[0].get("business_id") != business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Appointment does not belong to this business",
        )


# ---------------------------------------------------------------------------
# Realtime sessions
# ---------------------------------------------------------------------------


@router.post("/realtime/session")
async def realtime_session(
    request: Request,
    model: Optional[str] = None,
    business_id: Optional[str] = None,
):
    user = get_current_user(request)
    supabase = get_supabase()
    get_current_business(supabase, user.id, business_id)
    return await create_ephemeral_session(model=model)


@router.post("/demo/realtime/session")
async def demo_realtime_session(model: Optional[str] = None):
    return await create_ephemeral_session(model=model)


# ---------------------------------------------------------------------------
# Auth/profile
# ---------------------------------------------------------------------------


@router.get("/me", response_model=MeResponse)
async def get_me(request: Request):
    user = get_current_user(request)
    supabase = get_supabase()
    profile = ensure_user_profile(supabase, user)
    businesses = list_user_businesses(supabase, user.id)
    return {
        "user": _profile_response(profile),
        "businesses": businesses,
        "onboarding_required": len(businesses) == 0,
    }


@router.put("/me/profile", response_model=CurrentUserProfile)
async def update_me_profile(request: Request, payload: UserProfileUpdate):
    user = get_current_user(request)
    supabase = get_supabase()
    profile = ensure_user_profile(
        supabase,
        user,
        full_name=payload.full_name,
        personal_phone=payload.personal_phone,
    )
    return _profile_response(profile)


# ---------------------------------------------------------------------------
# Businesses
# ---------------------------------------------------------------------------


@router.post("/businesses", response_model=Business)
async def create_business(request: Request, payload: BusinessCreate):
    user = get_current_user(request)
    business = create_business_with_defaults(
        get_supabase(),
        user,
        payload.model_dump(),
    )
    logger.info("Created business %s for user %s", business["id"], user.id)
    return business


@router.get("/businesses", response_model=list[BusinessSummary])
async def get_businesses(request: Request):
    user = get_current_user(request)
    return list_user_businesses(get_supabase(), user.id)


@router.get("/businesses/{business_id}", response_model=Business)
async def get_business(request: Request, business_id: str):
    user = get_current_user(request)
    business, _ = get_current_business(get_supabase(), user.id, business_id)
    return business


@router.put("/businesses/{business_id}", response_model=Business)
async def put_business(request: Request, business_id: str, payload: BusinessUpdate):
    user = get_current_user(request)
    supabase = get_supabase()
    _, role = get_current_business(supabase, user.id, business_id)
    require_admin_role(role)
    return update_business(
        supabase,
        business_id,
        payload.model_dump(exclude_unset=True),
    )


@router.get("/businesses/{business_id}/settings", response_model=BusinessSettingsResponse)
async def get_settings(request: Request, business_id: str):
    user = get_current_user(request)
    supabase = get_supabase()
    get_current_business(supabase, user.id, business_id)
    return get_business_settings(supabase, business_id)


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------


@router.get("/customers", response_model=list[Customer])
async def list_customers(
    request: Request,
    limit: int = 25,
    business_id: Optional[str] = None,
):
    user = get_current_user(request)
    business, _ = get_current_business(get_supabase(), user.id, business_id)
    res = (
        get_supabase()
        .table("customers")
        .select("*")
        .eq("business_id", business["id"])
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.post("/customers", response_model=Customer)
async def create_customer(
    request: Request,
    payload: CustomerCreate,
    business_id: Optional[str] = None,
):
    user = get_current_user(request)
    supabase = get_supabase()
    business, _ = get_current_business(supabase, user.id, business_id)
    row = payload.model_dump()
    row["business_id"] = business["id"]
    res = supabase.table("customers").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create customer")
    logger.info("Created customer %s (%s)", res.data[0]["id"], payload.full_name)
    return res.data[0]


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------


@router.get("/appointments", response_model=list[Appointment])
async def list_appointments(
    request: Request,
    limit: int = 100,
    business_id: Optional[str] = None,
):
    user = get_current_user(request)
    business, _ = get_current_business(get_supabase(), user.id, business_id)
    res = (
        get_supabase()
        .table("appointments")
        .select("*")
        .eq("business_id", business["id"])
        .order("appointment_date")
        .order("start_time")
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.post("/appointments", response_model=AppointmentBookResult)
async def create_appointment(
    request: Request,
    payload: AppointmentCreate,
    business_id: Optional[str] = None,
):
    user = get_current_user(request)
    supabase = get_supabase()
    business, _ = get_current_business(supabase, user.id, business_id)
    _verify_customer_access(payload.customer_id, business["id"])
    return create_appointment_with_conflict_check(
        supabase,
        business_id=business["id"],
        customer_id=payload.customer_id,
        title=payload.title,
        service_type=payload.service_type,
        appointment_date=payload.appointment_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        notes=payload.notes,
    )


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------


@router.get("/calls", response_model=list[Call])
async def list_calls(
    request: Request,
    limit: int = 25,
    business_id: Optional[str] = None,
):
    user = get_current_user(request)
    business, _ = get_current_business(get_supabase(), user.id, business_id)
    res = (
        get_supabase()
        .table("calls")
        .select("*")
        .eq("business_id", business["id"])
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.post("/calls", response_model=Call)
async def create_call(
    request: Request,
    payload: CallCreate,
    business_id: Optional[str] = None,
):
    user = get_current_user(request)
    supabase = get_supabase()
    business, _ = get_current_business(supabase, user.id, business_id)
    _verify_customer_access(payload.customer_id, business["id"])
    _verify_appointment_access(payload.appointment_id, business["id"])
    row = payload.model_dump()
    row["business_id"] = business["id"]
    res = supabase.table("calls").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create call record")
    logger.info("Saved call summary %s", res.data[0]["id"])
    return res.data[0]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(request: Request, business_id: Optional[str] = None):
    user = get_current_user(request)
    business, _ = get_current_business(get_supabase(), user.id, business_id)
    return _get_dashboard_for_business(business["id"])


# ---------------------------------------------------------------------------
# Public demo
# ---------------------------------------------------------------------------


@router.get("/demo/customers", response_model=list[Customer])
async def demo_list_customers(limit: int = 25):
    res = (
        get_supabase()
        .table("customers")
        .select("*")
        .is_("business_id", "null")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.post("/demo/customers", response_model=Customer)
async def demo_create_customer(payload: CustomerCreate):
    row = payload.model_dump()
    row["business_id"] = None
    res = get_supabase().table("customers").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create customer")
    logger.info("Created demo customer %s (%s)", res.data[0]["id"], payload.full_name)
    return res.data[0]


@router.get("/demo/appointments", response_model=list[Appointment])
async def demo_list_appointments(limit: int = 100):
    res = (
        get_supabase()
        .table("appointments")
        .select("*")
        .is_("business_id", "null")
        .order("appointment_date")
        .order("start_time")
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.post("/demo/appointments", response_model=AppointmentBookResult)
async def demo_create_appointment(payload: AppointmentCreate):
    _verify_customer_access(payload.customer_id, None)
    return create_appointment_with_conflict_check(
        get_supabase(),
        business_id=None,
        customer_id=payload.customer_id,
        title=payload.title,
        service_type=payload.service_type,
        appointment_date=payload.appointment_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        notes=payload.notes,
    )


@router.get("/demo/calls", response_model=list[Call])
async def demo_list_calls(limit: int = 25):
    res = (
        get_supabase()
        .table("calls")
        .select("*")
        .is_("business_id", "null")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.post("/demo/calls", response_model=Call)
async def demo_create_call(payload: CallCreate):
    _verify_customer_access(payload.customer_id, None)
    _verify_appointment_access(payload.appointment_id, None)
    row = payload.model_dump()
    row["business_id"] = None
    res = get_supabase().table("calls").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create call record")
    logger.info("Saved demo call summary %s", res.data[0]["id"])
    return res.data[0]


@router.get("/demo/dashboard", response_model=DashboardResponse)
async def demo_get_dashboard():
    return _get_dashboard_for_business(None)


@router.post("/demo/reset")
async def demo_reset():
    supabase = get_supabase()
    supabase.table("calls").delete().is_("business_id", "null").execute()
    supabase.table("appointments").delete().is_("business_id", "null").execute()
    supabase.table("customers").delete().is_("business_id", "null").execute()
    logger.info("Demo data cleared")
    return {"ok": True}
