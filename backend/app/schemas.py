from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    full_name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class Customer(CustomerCreate):
    id: str
    created_at: datetime


class AppointmentCreate(BaseModel):
    customer_id: Optional[str] = None
    title: str = Field(..., min_length=1)
    service_type: Optional[str] = None
    appointment_date: date
    start_time: time
    end_time: Optional[time] = None
    notes: Optional[str] = None


class Appointment(BaseModel):
    id: str
    customer_id: Optional[str] = None
    title: str
    service_type: Optional[str] = None
    appointment_date: date
    start_time: time
    end_time: time
    status: str
    notes: Optional[str] = None
    created_at: datetime


class CallCreate(BaseModel):
    customer_id: Optional[str] = None
    appointment_id: Optional[str] = None
    session_id: Optional[str] = None
    caller_name: Optional[str] = None
    caller_phone: Optional[str] = None
    transcript: Optional[str] = None
    summary: str = Field(..., min_length=1)
    reason_for_call: Optional[str] = None
    preferred_time: Optional[str] = None
    reminder_preference: Optional[str] = None
    needs_human_follow_up: bool = False
    is_emergency: bool = False
    handled_by: str = "AI Receptionist"


class Call(CallCreate):
    id: str
    created_at: datetime


class AppointmentBookResult(BaseModel):
    booked: bool
    appointment: Optional[Appointment] = None
    conflict: bool = False
    suggested_start_time: Optional[time] = None
    message: Optional[str] = None


class DashboardResponse(BaseModel):
    latest_customer: Optional[Customer] = None
    latest_appointment: Optional[Appointment] = None
    latest_call: Optional[Call] = None
    recent_calls: list[Call] = []
    recent_customers: list[Customer] = []
    appointments: list[Appointment] = []
