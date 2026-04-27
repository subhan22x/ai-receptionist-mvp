import {
  createAppointment,
  createCall,
  createCustomer,
  createRealtimeSession,
  LOCAL_TIMEZONE,
  RealtimeModelId,
} from "../api";
import { Ringback } from "./ringback";

const RINGBACK_AUDIO_SRC = "/ringback.mp3";

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "in_call"
  | "ending"
  | "ended"
  | "error";

export type StatusEvent =
  | { kind: "status"; status: RealtimeStatus; detail?: string }
  | { kind: "info"; message: string }
  | { kind: "error"; message: string }
  | { kind: "tool"; name: string; ok: boolean; detail?: string };

type Listener = (e: StatusEvent) => void;

const TOOL_DEFS = [
  {
    type: "function" as const,
    name: "save_customer",
    description:
      "Save or update the customer's contact details. Call this once you have the customer's full name and any other available details. Returns the customer's id.",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "Customer full name." },
        phone: { type: "string", description: "Optional phone number." },
        email: { type: "string", description: "Optional email address." },
        address: {
          type: "string",
          description: "Service address where the work is needed.",
        },
      },
      required: ["full_name"],
    },
  },
  {
    type: "function" as const,
    name: "book_appointment",
    description:
      "Book a one-hour appointment for the customer. Use 24-hour HH:MM format for start_time and YYYY-MM-DD for appointment_date.",
    parameters: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "Customer id returned from save_customer.",
        },
        title: { type: "string", description: "Short appointment title." },
        service_type: {
          type: "string",
          description: "Plumbing service category, e.g. 'leak repair'.",
        },
        appointment_date: {
          type: "string",
          description: "Appointment date in YYYY-MM-DD (local time).",
        },
        start_time: {
          type: "string",
          description: "Start time in HH:MM 24-hour (local time).",
        },
        notes: { type: "string" },
      },
      required: ["customer_id", "title", "appointment_date", "start_time"],
    },
  },
  {
    type: "function" as const,
    name: "save_call_summary",
    description:
      "Save a short summary of the call once enough detail has been gathered or before ending the call.",
    parameters: {
      type: "object",
      properties: {
        customer_id: { type: "string" },
        appointment_id: { type: "string" },
        caller_name: { type: "string" },
        caller_phone: { type: "string" },
        transcript: { type: "string" },
        summary: { type: "string" },
        reason_for_call: { type: "string" },
        preferred_time: { type: "string" },
        reminder_preference: { type: "string" },
        needs_human_follow_up: { type: "boolean" },
        is_emergency: { type: "boolean" },
      },
      required: ["summary"],
    },
  },
];

const SYSTEM_INSTRUCTIONS = `You are an AI receptionist for a plumbing company. Your job is to answer inbound calls, understand the issue, collect lead details, book an appointment, and create a short call summary.

Tone:
Be calm, brief, confident, and useful. Ask one question at a time. Lead the conversation. Do not mention tools, APIs, databases, or internal systems.

Opening:
“XYZ Plumbing, How can I help you today”

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
“Please leave the property now, avoid using switches, flames, vehicles, doorbells, or anything that could spark, and call 911 from outside. I can still take the address and mark this as urgent.”
Then collect address, name, callback number, and where the smell was noticed.

Call control:
If the caller is vague, ask:
“Is it a leak, clog, water heater issue, gas issue, or something else?”

If they only ask for price, say:
“Pricing depends on the exact issue, access, and parts needed. I can get you scheduled so the technician can give the right estimate.”

If they resist details, say:
“I just need a couple details so we can get someone to the right place.”

If they ask for a human, say:
“I can mark this for human follow up. Someone from the team will need to reach out.”
Set needs_human_follow_up=true.

Scheduling:
Business hours are 9:00 AM to 5:00 PM. Default appointment length is 1 hour. If the caller gives a vague time like “Friday morning,” suggest a specific time:
“I can put you down for Friday at 9:00 AM. Does that work?”

If the requested slot is unavailable, offer the next closest available time.

After collecting required details:
1. Call save_customer.
2. Call book_appointment.
3. If booking succeeds, call save_call_summary.
4. If booking returns a suggested time, confirm it with the caller first.

Summary:
Write one short paragraph with the customer name, address, issue, urgency, service category, appointment time, and special notes.

Closing:
“Alright, you’re booked for [day] at [time] at [address]. Thanks for calling.`;

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function asBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

export class RealtimeClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private listeners = new Set<Listener>();
  private sessionId: string | null = null;
  private knownCustomerId: string | null = null;
  private knownAppointmentId: string | null = null;
  private status: RealtimeStatus = "idle";
  private ringback: Ringback | null = null;
  private ringbackEnded = false;
  private connectionReady = false;

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getStatus(): RealtimeStatus {
    return this.status;
  }

  private emit(e: StatusEvent) {
    if (e.kind === "status") this.status = e.status;
    for (const l of this.listeners) l(e);
  }

  async start(requestedModel?: RealtimeModelId) {
    if (this.status === "in_call" || this.status === "connecting") return;
    this.emit({ kind: "status", status: "connecting" });

    this.ringbackEnded = false;
    this.connectionReady = false;
    this.ringback = new Ringback();
    this.ringback.start(RINGBACK_AUDIO_SRC, () => {
      this.ringbackEnded = true;
      this.maybeStartGreeting();
    });

    let session;
    try {
      session = await createRealtimeSession(requestedModel);
    } catch (err) {
      this.stopRingback();
      this.emit({
        kind: "error",
        message: `Failed to create session: ${(err as Error).message}`,
      });
      this.emit({ kind: "status", status: "error" });
      return;
    }
    this.sessionId = session.id;
    const ephemeralKey = session.client_secret?.value;
    const model = session.model;
    if (!ephemeralKey) {
      this.stopRingback();
      this.emit({ kind: "error", message: "Missing ephemeral key from session." });
      this.emit({ kind: "status", status: "error" });
      return;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      this.stopRingback();
      this.emit({
        kind: "error",
        message: `Microphone permission was denied or unavailable: ${(err as Error).message}`,
      });
      this.emit({ kind: "status", status: "error" });
      return;
    }

    const pc = new RTCPeerConnection();
    this.pc = pc;

    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    pc.ontrack = (e) => {
      if (this.audioEl) this.audioEl.srcObject = e.streams[0];
    };

    for (const track of this.localStream.getTracks()) {
      pc.addTrack(track, this.localStream);
    }

    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onopen = () => this.onDataChannelOpen();
    dc.onmessage = (e) => this.onDataChannelMessage(e);

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        this.emit({ kind: "error", message: `Connection ${pc.connectionState}` });
        this.emit({ kind: "status", status: "error" });
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );
      if (!sdpRes.ok) {
        const text = await sdpRes.text();
        throw new Error(`Realtime SDP exchange failed: ${sdpRes.status} ${text}`);
      }
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      this.emit({ kind: "error", message: (err as Error).message });
      this.emit({ kind: "status", status: "error" });
      await this.stop();
    }
  }

  private send(event: object) {
    if (this.dc && this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(event));
    }
  }

  private onDataChannelOpen() {
    this.send({
      type: "session.update",
      session: {
        instructions: SYSTEM_INSTRUCTIONS,
        tools: TOOL_DEFS,
        tool_choice: "auto",
        modalities: ["audio", "text"],
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1130,
        },
      },
    });

    this.connectionReady = true;
    this.maybeStartGreeting();
  }

  private maybeStartGreeting() {
    if (!this.ringbackEnded || !this.connectionReady) return;
    if (this.status !== "connecting") return;

    this.stopRingback();
    this.emit({ kind: "status", status: "in_call" });
    this.emit({ kind: "info", message: "AI Receptionist is listening" });

    this.send({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions:
          "say this is XYZ plumbing, and ask the caller 'how can I help you today'",
      },
    });
  }

  private stopRingback() {
    this.ringback?.stop();
    this.ringback = null;
  }

  private onDataChannelMessage(e: MessageEvent) {
    let evt: { type?: string; [k: string]: unknown };
    try {
      evt = JSON.parse(e.data);
    } catch {
      return;
    }

    switch (evt.type) {
      case "response.function_call_arguments.done":
        this.handleToolCall(
          (evt as { name: string; call_id: string; arguments: string }).name,
          (evt as { call_id: string }).call_id,
          (evt as { arguments: string }).arguments,
        );
        break;
      case "error":
        this.emit({
          kind: "error",
          message: `Realtime error: ${JSON.stringify(evt.error || evt)}`,
        });
        break;
      default:
        break;
    }
  }

  private async handleToolCall(name: string, callId: string, argsJson: string) {
    const args = safeParse(argsJson);
    let output: Record<string, unknown> = {};
    let ok = true;
    let detail: string | undefined;

    try {
      if (name === "save_customer") {
        const customer = await createCustomer({
          full_name: String(args.full_name ?? "Unknown"),
          phone: asString(args.phone) ?? null,
          email: asString(args.email) ?? null,
          address: asString(args.address) ?? null,
        });
        this.knownCustomerId = customer.id;
        output = { customer_id: customer.id, ok: true };
        detail = "Customer saved";
      } else if (name === "book_appointment") {
        const customerId = asString(args.customer_id) ?? this.knownCustomerId ?? "";
        const result = await createAppointment({
          customer_id: customerId || null,
          title: String(args.title ?? "Plumbing appointment"),
          service_type: asString(args.service_type) ?? null,
          appointment_date: String(args.appointment_date),
          start_time: String(args.start_time),
          notes: asString(args.notes) ?? null,
        });
        if (result.booked && result.appointment) {
          this.knownAppointmentId = result.appointment.id;
          output = {
            ok: true,
            booked: true,
            appointment_id: result.appointment.id,
            appointment_date: result.appointment.appointment_date,
            start_time: result.appointment.start_time,
            end_time: result.appointment.end_time,
          };
          detail = "Appointment booked";
        } else {
          output = {
            ok: true,
            booked: false,
            conflict: result.conflict,
            suggested_start_time: result.suggested_start_time,
            message: result.message,
          };
          detail = result.message ?? "Slot unavailable";
        }
      } else if (name === "save_call_summary") {
        const call = await createCall({
          customer_id: asString(args.customer_id) ?? this.knownCustomerId ?? null,
          appointment_id:
            asString(args.appointment_id) ?? this.knownAppointmentId ?? null,
          session_id: this.sessionId,
          caller_name: asString(args.caller_name) ?? null,
          caller_phone: asString(args.caller_phone) ?? null,
          transcript: asString(args.transcript) ?? null,
          summary: String(args.summary ?? "Call ended."),
          reason_for_call: asString(args.reason_for_call) ?? null,
          preferred_time: asString(args.preferred_time) ?? null,
          reminder_preference: asString(args.reminder_preference) ?? null,
          needs_human_follow_up: asBool(args.needs_human_follow_up) ?? false,
          is_emergency: asBool(args.is_emergency) ?? false,
        });
        output = { ok: true, call_id: call.id };
        detail = call.needs_human_follow_up
          ? "Human follow up requested"
          : "Summary saved";
      } else {
        ok = false;
        output = { ok: false, error: `Unknown tool: ${name}` };
      }
    } catch (err) {
      ok = false;
      const message = (err as Error).message;
      output = { ok: false, error: message };
      detail = message;
    }

    this.emit({ kind: "tool", name, ok, detail });

    this.send({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(output),
      },
    });
    this.send({ type: "response.create" });
  }

  async stop() {
    if (this.status === "ended" || this.status === "idle") return;
    this.emit({ kind: "status", status: "ending" });

    this.stopRingback();
    this.ringbackEnded = false;
    this.connectionReady = false;

    try {
      this.dc?.close();
    } catch {
      /* noop */
    }
    try {
      this.pc?.close();
    } catch {
      /* noop */
    }
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) track.stop();
    }
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
    this.dc = null;
    this.pc = null;
    this.localStream = null;
    this.knownCustomerId = null;
    this.knownAppointmentId = null;
    this.sessionId = null;

    this.emit({ kind: "status", status: "ended" });
  }
}
