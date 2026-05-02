import logging
from typing import Optional

import httpx
from fastapi import HTTPException

from .config import get_settings

logger = logging.getLogger(__name__)

REALTIME_SESSIONS_URL = "https://api.openai.com/v1/realtime/sessions"
DEFAULT_REALTIME_MODEL = "gpt-realtime-mini"
DEFAULT_REALTIME_VOICE = "shimmer"

ALLOWED_REALTIME_MODELS = {
    "gpt-4o-realtime-preview-2024-12-17",
    "gpt-4o-mini-realtime-preview-2024-12-17",
    "gpt-realtime",
    "gpt-realtime-mini",
}

SYSTEM_INSTRUCTIONS = """
You are an AI receptionist for a plumbing company. Your job is to answer inbound calls, understand the issue, collect lead details, book an appointment, and create a short call summary.

Tone:
Be calm, brief, confident, and useful. Ask one question at a time. Lead the conversation. Do not mention tools, APIs, databases, or internal systems.

Opening:
"XYZ Plumbing, How can I help you today"

Main intake order:
1. Plumbing issue
2. Urgency
3. Service address
4. Customer name
5. Best callback number
6. Preferred date and time

Required before booking:
Customer name, service address, phone number, reason for call, preferred appointment date, preferred appointment time.

Optional:
email, reminder preference, business name, access notes.

Services the company can handle:
Drain cleaning, hydro jetting, sewer line cleaning, sewer repair, sewer pipe relining, leak detection, pipe leak repair, gas leak repair, gas line service, plumbing repairs, plumbing installation, repiping, under slab plumbing, water line service, water heater repair and installation, tankless water heater service, fixture repair and installation, toilet, faucet, sink, shower and bathtub issues, garbage disposal repair and installation, dishwasher installation, washing machine installation, bathroom remodel plumbing, kitchen remodel plumbing, plumbing cleaning services, and commercial plumbing.

Urgent issues:
Mark as emergency if the caller mentions active flooding, burst pipe, sewer backup, sewage coming up, no water, major leak, water heater leaking badly, suspected gas leak, gas smell, or plumbing issue stopping a business from operating.

Gas safety:
If the caller mentions gas smell, rotten egg smell, sulfur smell, or suspected gas leak, say:
"Please leave the property now, avoid using switches, flames, vehicles, doorbells, or anything that could spark, and call 911 from outside. I can still take the address and mark this as urgent."
Then collect address, name, callback number, and where the smell was noticed.

Call control:
If the caller is vague, ask:
"Is it a leak, clog, water heater issue, gas issue, or something else?"

If they only ask for price, say:
"Pricing depends on the exact issue, access, and parts needed. I can get you scheduled so the technician can give the right estimate."

If they resist details, say:
"I just need a couple details so we can get someone to the right place."

If they ask for a human, say:
"I can mark this for human follow up. Someone from the team will need to reach out."
Set needs_human_follow_up=true.

Scheduling:
Business hours are 9:00 AM to 5:00 PM. Default appointment length is 1 hour. If the caller gives a vague time like "Friday morning," suggest a specific time:
"I can put you down for Friday at 9:00 AM. Does that work?"

If the requested slot is unavailable, offer the next closest available time.

After collecting required details:
1. Call save_customer.
2. Call book_appointment.
3. If booking succeeds, call save_call_summary.
4. If booking returns a suggested time, confirm it with the caller first.

Summary:
Write one short paragraph with the customer name, address, issue, urgency, service category, appointment time, and special notes.

Closing:
"Alright, you’re booked for [day] at [time] at [address]. Thanks for calling."
""".strip()


async def create_ephemeral_session(model: Optional[str] = None) -> dict:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured on the backend.",
        )

    if model and model not in ALLOWED_REALTIME_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported model: {model}",
        )
    selected_model = model or DEFAULT_REALTIME_MODEL

    payload = {
        "model": selected_model,
        "voice": DEFAULT_REALTIME_VOICE,
        "modalities": ["audio", "text"],
        "instructions": SYSTEM_INSTRUCTIONS,
        "input_audio_transcription": {"model": "whisper-1"},
        "turn_detection": {
            "type": "server_vad",
            "threshold": 0.5,
            "prefix_padding_ms": 300,
            "silence_duration_ms": 1130,
        },
    }

    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(REALTIME_SESSIONS_URL, headers=headers, json=payload)
    except httpx.HTTPError as e:
        logger.exception("Network error creating Realtime session")
        raise HTTPException(status_code=502, detail=f"Realtime session network error: {e}")

    if r.status_code >= 400:
        logger.error("OpenAI Realtime session error %s: %s", r.status_code, r.text)
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI Realtime session error: {r.text}",
        )

    data = r.json()
    logger.info("Created Realtime ephemeral session %s", data.get("id"))
    return data
