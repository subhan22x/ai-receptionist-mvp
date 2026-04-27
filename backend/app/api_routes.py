import logging
from datetime import date, datetime, time
from typing import Optional

from fastapi import APIRouter, HTTPException

from .db import get_supabase
from .realtime_session import create_ephemeral_session
from .scheduling import create_appointment_with_conflict_check
from .schemas import (
    Appointment,
    AppointmentBookResult,
    AppointmentCreate,
    Call,
    CallCreate,
    Customer,
    CustomerCreate,
    DashboardResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _parse_time(value) -> time:
    if isinstance(value, time):
        return value
    return time.fromisoformat(str(value))


def _parse_date(value) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    return date.fromisoformat(str(value))


# ---------------------------------------------------------------------------
# Realtime session
# ---------------------------------------------------------------------------

@router.post("/realtime/session")
async def realtime_session():
    data = await create_ephemeral_session()
    return data


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------

@router.get("/customers", response_model=list[Customer])
async def list_customers(limit: int = 25):
    supabase = get_supabase()
    res = (
        supabase.table("customers")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.post("/customers", response_model=Customer)
async def create_customer(payload: CustomerCreate):
    supabase = get_supabase()
    res = supabase.table("customers").insert(payload.model_dump()).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create customer")
    logger.info("Created customer %s (%s)", res.data[0]["id"], payload.full_name)
    return res.data[0]


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------

@router.get("/appointments", response_model=list[Appointment])
async def list_appointments(limit: int = 100):
    supabase = get_supabase()
    res = (
        supabase.table("appointments")
        .select("*")
        .order("appointment_date")
        .order("start_time")
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.post("/appointments", response_model=AppointmentBookResult)
async def create_appointment(payload: AppointmentCreate):
    supabase = get_supabase()
    result = create_appointment_with_conflict_check(
        supabase,
        customer_id=payload.customer_id,
        title=payload.title,
        service_type=payload.service_type,
        appointment_date=payload.appointment_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        notes=payload.notes,
    )
    return result


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------

@router.get("/calls", response_model=list[Call])
async def list_calls(limit: int = 25):
    supabase = get_supabase()
    res = (
        supabase.table("calls")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.post("/calls", response_model=Call)
async def create_call(payload: CallCreate):
    supabase = get_supabase()
    res = supabase.table("calls").insert(payload.model_dump()).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create call record")
    logger.info("Saved call summary %s", res.data[0]["id"])
    return res.data[0]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard():
    supabase = get_supabase()

    customers = (
        supabase.table("customers")
        .select("*")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
        .data
        or []
    )

    appointments = (
        supabase.table("appointments")
        .select("*")
        .order("appointment_date")
        .order("start_time")
        .limit(100)
        .execute()
        .data
        or []
    )

    calls = (
        supabase.table("calls")
        .select("*")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
        .data
        or []
    )

    latest_appointment: Optional[dict] = None
    if appointments:
        # Sort by created_at desc on a copy so we surface the most recently booked
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


# ---------------------------------------------------------------------------
# Demo reset
# ---------------------------------------------------------------------------

@router.post("/demo/reset")
async def demo_reset():
    supabase = get_supabase()
    # Delete in dependency order. PostgREST requires a filter — we use a
    # tautology on the primary key.
    supabase.table("calls").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    logger.info("Demo data cleared")
    return {"ok": True}
