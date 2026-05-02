# AI Receptionist MVP — Multi-Tenant SaaS Foundation

A FastAPI + React MVP for an AI receptionist SaaS. v0.2 adds Google-only
Supabase Auth, business onboarding, backend-enforced tenant access, a protected
business dashboard, and a separate public demo route.

The public demo is still purely a **website**: no Twilio, no PSTN, no real
phone numbers, no Google Calendar. The voice agent runs over **OpenAI Realtime
+ WebRTC** with a short-lived ephemeral token issued by the backend, so your
real `OPENAI_API_KEY` never reaches the browser.

```
ai-receptionist-mvp/
├── backend/          FastAPI + Supabase
├── frontend/         React + Vite + TS + Tailwind + FullCalendar
└── supabase/         SQL migration
```

---

## 1. Create a Supabase project

1. Go to <https://supabase.com>, sign in, and click **New project**.
2. Pick any name (e.g. `ai-receptionist-demo`), set a database password, and
   choose a region close to you.
3. Wait for provisioning to finish.
4. From **Project Settings → API**, copy:
   - **Project URL** → this is `SUPABASE_URL`
   - **anon/public** key → this is `VITE_SUPABASE_ANON_KEY`
   - **service_role** key (under "Project API keys") → this is
     `SUPABASE_SERVICE_ROLE_KEY`. Never expose this key to the browser.

## 2. Run the SQL migration

Open **SQL Editor → New query** in the Supabase dashboard and paste the
contents of these migrations in order, then click **Run**:

- [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
- [`supabase/migrations/002_multi_tenant_accounts.sql`](supabase/migrations/002_multi_tenant_accounts.sql)

The second migration adds user profiles, businesses, business memberships,
business settings tables, and nullable `business_id` columns on the original
demo tables.

> v0.2 enforces tenant access in the FastAPI backend. RLS is intentionally not
> enabled yet.

## 3. Configure Google Auth in Supabase

1. In Google Cloud, create an OAuth client ID for a web application.
2. Add `http://localhost:5173` to Google **Authorized JavaScript origins**.
3. Add your Supabase Auth callback URL to Google **Authorized redirect URIs**.
   Supabase shows this on the Google provider page.
4. In Supabase **Authentication → Providers → Google**, enable Google and paste
   the Google client ID and client secret.
5. In Supabase **Authentication → URL Configuration**, add:
   - `http://localhost:5173/auth/callback`
   - your production `/auth/callback` URL when deployed

## 4. Create an OpenAI API key

1. Go to <https://platform.openai.com/api-keys> and create a new secret key.
2. Make sure your account has access to the **Realtime API** (enabled by
   default for paid accounts). The dashboard includes a model picker, so the
   selected Realtime model is sent with each call instead of being controlled by
   an environment variable.

## 5. Backend environment variables

Copy [`backend/.env.example`](backend/.env.example) to `backend/.env` and fill it in:

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FRONTEND_URL=http://localhost:5173
LOCAL_TIMEZONE=America/Chicago
```

## 6. Frontend environment variables

Copy [`frontend/.env.example`](frontend/.env.example) to `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 7. Run the backend locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Sanity check: `curl http://localhost:8000/health` should report
`supabase_configured: true` and `openai_configured: true`.

## 8. Run the frontend locally

```bash
cd frontend
npm install
npm run dev
```

Then open <http://localhost:5173>. Use `/login` for the SaaS flow or `/demo`
for the public browser-call demo.

## 9. Test account onboarding

1. Open <http://localhost:5173/login>.
2. Click **Continue with Google**.
3. Complete the Google OAuth redirect.
4. Fill out the business onboarding form.
5. Confirm the dashboard shows the current business name in the top bar.

## 10. Test the fake call from the public demo

1. Open <http://localhost:5173/demo>.
2. Click the big orange phone button ("Tap to call our AI receptionist").
3. Approve the microphone permission prompt.
4. Wait ~1–2 seconds for the connection to establish — the button turns red
   and you'll hear the AI greet you.
5. Have a normal conversation. Tell it your name, the address, what's wrong,
   and a preferred date/time. The AI will ask one question at a time, then
   confirm and book the appointment.
6. Click the red button to end the call.

## 11. How the dashboards update

- The SaaS dashboard polls protected `GET /api/dashboard?business_id=...`.
- The public demo polls `GET /api/demo/dashboard`.
- During the call you'll see status messages under the call button:
  *"AI Receptionist is listening" → "Customer saved" → "Appointment booked"
  → "Summary saved"* (or *"Human follow up requested"* when applicable).
- The CRM card, calendar, and call summary card all update from the same
  endpoint.

## 12. Known limitations

- **Demo only.** This is not a production phone system — there's no PSTN
  integration, recording, or compliance handling.
- **Google-only auth.** Email/password, invites, and team management are not in
  v0.2.
- **Browser support.** Microphone + WebRTC requires a modern desktop or
  mobile browser with mic permission. iOS Safari requires user gesture
  before audio can play (the call button counts).
- **Tenant foundation only.** Business accounts are isolated through backend
  checks, but full tenant-scoped CRM objects are the next step.
- **No retries.** Tool calls fail-fast; the AI is told to apologize and
  continue rather than retry an exact backend operation.
- **Time zone.** All wall-clock times are interpreted in `LOCAL_TIMEZONE`
  (America/Chicago by default). `created_at` columns are UTC.
- **Conflict handling.** The scheduler suggests the next available 1-hour
  slot in business hours (9:00–17:00 local). Outside that window it returns
  *no availability* and the AI is expected to ask for a different day.

## 13. Production upgrade path with a real phone number

When you want to replace the website call button with a real inbound number,
the path is roughly:

1. Buy a phone number on **Twilio**.
2. Configure the number's voice webhook to point to a new backend route that
   returns TwiML `<Connect><Stream>` to a WebSocket endpoint on your server.
3. On that WebSocket, bridge inbound G.711 audio from Twilio into the
   OpenAI Realtime API (using the WebSocket transport, not WebRTC). The
   tool definitions, system instructions, and Supabase tool handlers in
   [`backend/app/realtime_session.py`](backend/app/realtime_session.py) and
   [`frontend/src/lib/realtimeClient.ts`](frontend/src/lib/realtimeClient.ts)
   port over almost unchanged — only the audio transport differs.
4. Send the AI-generated audio back to Twilio over the same Stream.
5. Persist tenant-scoped `customers` / `appointments` / `calls` rows for the
   selected business.
6. For SMS reminders, schedule a small worker that scans `appointments` and
   sends Twilio SMS based on `reminder_preference`.

Hosting:
- **Backend** → Railway, Render, Fly.io, or DigitalOcean App Platform. All
  four can run a FastAPI app with a `pip install` build and a `uvicorn`
  start command.
- **Frontend** → Netlify or Cloudflare Pages. The repo intentionally has no
  Vercel- or Next.js-specific code.
- **Database** → keep Supabase, or migrate the schema in
  [`supabase/migrations`](supabase/migrations) to any managed Postgres.
