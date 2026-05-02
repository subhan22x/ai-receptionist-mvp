from datetime import date, datetime, time
from typing import Any, Optional

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    full_name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class Customer(CustomerCreate):
    id: str
    business_id: Optional[str] = None
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
    business_id: Optional[str] = None
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
    business_id: Optional[str] = None
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
    recent_calls: list[Call] = Field(default_factory=list)
    recent_customers: list[Customer] = Field(default_factory=list)
    appointments: list[Appointment] = Field(default_factory=list)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    personal_phone: Optional[str] = None


class CurrentUserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    personal_phone: Optional[str] = None


class BusinessSummary(BaseModel):
    id: str
    business_name: str
    industry: Optional[str] = None
    timezone: Optional[str] = None
    role: str


class MeResponse(BaseModel):
    user: CurrentUserProfile
    businesses: list[BusinessSummary] = Field(default_factory=list)
    onboarding_required: bool


class BusinessCreate(BaseModel):
    business_name: str = Field(..., min_length=1)
    industry: Optional[str] = None
    timezone: Optional[str] = "America/Chicago"
    service_area: Optional[str] = None
    business_address: Optional[str] = None
    business_city: Optional[str] = None
    business_state: Optional[str] = None
    business_zip: Optional[str] = None
    business_website: Optional[str] = None
    business_phone: Optional[str] = None
    notification_phone: Optional[str] = None


class BusinessUpdate(BaseModel):
    business_name: Optional[str] = None
    industry: Optional[str] = None
    timezone: Optional[str] = None
    service_area: Optional[str] = None
    business_address: Optional[str] = None
    business_city: Optional[str] = None
    business_state: Optional[str] = None
    business_zip: Optional[str] = None
    business_website: Optional[str] = None
    business_phone: Optional[str] = None
    notification_phone: Optional[str] = None


class Business(BaseModel):
    id: str
    owner_user_id: Optional[str] = None
    business_name: str
    industry: Optional[str] = None
    timezone: Optional[str] = None
    service_area: Optional[str] = None
    business_address: Optional[str] = None
    business_city: Optional[str] = None
    business_state: Optional[str] = None
    business_zip: Optional[str] = None
    business_website: Optional[str] = None
    business_phone: Optional[str] = None
    notification_phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class BusinessSettingsResponse(BaseModel):
    business: dict[str, Any]
    services: list[dict[str, Any]] = Field(default_factory=list)
    business_hours: list[dict[str, Any]] = Field(default_factory=list)
    booking_rules: Optional[dict[str, Any]] = None
    ai_agent: Optional[dict[str, Any]] = None
    notification_preferences: Optional[dict[str, Any]] = None
