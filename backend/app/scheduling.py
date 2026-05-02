import logging
from datetime import date, datetime, time, timedelta
from typing import Optional

from supabase import Client

from .schemas import Appointment, AppointmentBookResult

logger = logging.getLogger(__name__)

BUSINESS_OPEN = time(9, 0)
BUSINESS_CLOSE = time(17, 0)
DEFAULT_DURATION = timedelta(hours=1)


def _combine(d: date, t: time) -> datetime:
    return datetime.combine(d, t)


def _add_duration(start: time, duration: timedelta = DEFAULT_DURATION) -> time:
    end_dt = _combine(date.today(), start) + duration
    return end_dt.time()


def _fetch_day_appointments(
    supabase: Client,
    on_date: date,
    business_id: Optional[str] = None,
) -> list[dict]:
    query = (
        supabase.table("appointments")
        .select("*")
        .eq("appointment_date", on_date.isoformat())
        .neq("status", "cancelled")
    )
    if business_id is None:
        query = query.is_("business_id", "null")
    else:
        query = query.eq("business_id", business_id)
    res = query.order("start_time").execute()
    return res.data or []


def check_slot_available(
    supabase: Client,
    on_date: date,
    start_time: time,
    end_time: time,
    business_id: Optional[str] = None,
) -> bool:
    """A slot is available if no existing appointment overlaps it.

    Two ranges overlap when: new_start < existing_end and new_end > existing_start.
    """
    rows = _fetch_day_appointments(supabase, on_date, business_id)
    for row in rows:
        existing_start = time.fromisoformat(row["start_time"])
        existing_end = time.fromisoformat(row["end_time"])
        if start_time < existing_end and end_time > existing_start:
            return False
    return True


def get_next_available_slot(
    supabase: Client,
    on_date: date,
    preferred_start_time: time,
    duration: timedelta = DEFAULT_DURATION,
    business_id: Optional[str] = None,
) -> Optional[time]:
    """Walk forward in 1-hour steps from the preferred time until we find a free slot.

    Returns None if no slot is available before close of business on `on_date`.
    """
    candidate = preferred_start_time
    if candidate < BUSINESS_OPEN:
        candidate = BUSINESS_OPEN

    rows = _fetch_day_appointments(supabase, on_date, business_id)
    busy = [
        (time.fromisoformat(r["start_time"]), time.fromisoformat(r["end_time"]))
        for r in rows
    ]

    while True:
        candidate_end_dt = _combine(on_date, candidate) + duration
        if candidate_end_dt.time() > BUSINESS_CLOSE:
            return None
        candidate_end = candidate_end_dt.time()
        conflict = any(
            candidate < e and candidate_end > s for (s, e) in busy
        )
        if not conflict:
            return candidate
        next_dt = _combine(on_date, candidate) + timedelta(hours=1)
        candidate = next_dt.time()


def create_appointment_with_conflict_check(
    supabase: Client,
    *,
    business_id: Optional[str] = None,
    customer_id: Optional[str],
    title: str,
    service_type: Optional[str],
    appointment_date: date,
    start_time: time,
    end_time: Optional[time] = None,
    notes: Optional[str] = None,
) -> AppointmentBookResult:
    if end_time is None:
        end_time = _add_duration(start_time)

    if check_slot_available(
        supabase,
        appointment_date,
        start_time,
        end_time,
        business_id,
    ):
        payload = {
            "business_id": business_id,
            "customer_id": customer_id,
            "title": title,
            "service_type": service_type,
            "appointment_date": appointment_date.isoformat(),
            "start_time": start_time.isoformat(timespec="minutes"),
            "end_time": end_time.isoformat(timespec="minutes"),
            "notes": notes,
            "status": "booked",
        }
        res = supabase.table("appointments").insert(payload).execute()
        if not res.data:
            logger.error("Failed to insert appointment: %s", res)
            return AppointmentBookResult(
                booked=False,
                conflict=False,
                message="Failed to save appointment.",
            )
        appt = Appointment(**res.data[0])
        logger.info("Booked appointment %s on %s at %s", appt.id, appointment_date, start_time)
        return AppointmentBookResult(booked=True, appointment=appt)

    suggested = get_next_available_slot(
        supabase,
        appointment_date,
        start_time,
        business_id=business_id,
    )
    if suggested is None:
        return AppointmentBookResult(
            booked=False,
            conflict=True,
            message="No availability remaining on that date.",
        )
    return AppointmentBookResult(
        booked=False,
        conflict=True,
        suggested_start_time=suggested,
        message=f"That slot is taken. Next available is {suggested.strftime('%I:%M %p').lstrip('0')}.",
    )
