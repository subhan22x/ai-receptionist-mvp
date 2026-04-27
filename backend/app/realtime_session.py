import logging
from typing import Optional

import httpx
from fastapi import HTTPException

from .config import get_settings

logger = logging.getLogger(__name__)

REALTIME_SESSIONS_URL = "https://api.openai.com/v1/realtime/sessions"

ALLOWED_REALTIME_MODELS = {
    "gpt-4o-realtime-preview-2024-12-17",
    "gpt-4o-mini-realtime-preview-2024-12-17",
    "gpt-realtime",
    "gpt-realtime-mini",
}

SYSTEM_INSTRUCTIONS = (
    "You are an AI receptionist for a plumbing company. Your job is to answer "
    "website demo calls, collect customer information, book appointments, and "
    "summarize the call. Ask one question at a time. Keep answers short and "
    "natural. Do not mention tools, APIs, databases, or internal systems. "
    "Required details before booking are customer name, service address, "
    "reason for call, preferred appointment date, and preferred appointment "
    "time. Optional details are phone, email, and reminder preference. If "
    "time is vague, suggest a specific time and confirm it. If the user asks "
    "for a human, mark the call for human follow up. If the issue sounds "
    "urgent, mark it as emergency. After collecting the details, confirm the "
    "appointment and save the customer, appointment, and call summary."
)


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
    selected_model = model or settings.openai_realtime_model

    payload = {
        "model": selected_model,
        "voice": settings.openai_realtime_voice,
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
