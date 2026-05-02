# System Architecture

# AI Receptionist SaaS Architecture

## 1. Architecture summary

The system should be built as a modular monolith.

A modular monolith means one backend application and one main database, but the code is separated into clear modules. This is better than microservices for the early product because it is faster to build, easier to debug, and easier to deploy.

Recommended structure:

1. React frontend
2. FastAPI backend
3. Supabase Postgres database
4. Supabase Auth or backend managed auth
5. Stripe for subscriptions and future payments
6. Twilio for phone calls and SMS
7. OpenAI Realtime for AI voice calls
8. Admin dashboard for internal support

## 2. Main system components

## 2.1 Frontend

Purpose:

1. Client account interface
2. Dashboard
3. CRM views
4. Calendar
5. Calls page
6. Jobs page
7. Billing page
8. Business settings
9. Admin interface

Recommended stack:

1. React
2. Vite
3. TypeScript
4. Tailwind
5. FullCalendar for calendar view

The frontend should not hold business logic. It should display data and call backend APIs.

## 2.2 Backend

Purpose:

1. Auth verification
2. Tenant access checks
3. Business logic
4. CRM APIs
5. Billing APIs
6. Twilio webhooks
7. Stripe webhooks
8. OpenAI Realtime connection
9. SMS notifications
10. Usage tracking

Recommended stack:

1. FastAPI
2. Pydantic models
3. SQLAlchemy or Supabase client
4. Alembic or Supabase migrations
5. WebSocket support for phone audio bridge

## 2.3 Database

Purpose:

1. Store tenants
2. Store users and business access
3. Store CRM records
4. Store calls and call events
5. Store appointments and jobs
6. Store billing and subscriptions
7. Store notifications
8. Store usage events
9. Store webhook processing records

Recommended database:

1. Supabase Postgres

Main rule:

Every tenant owned table must include business_id.

## 2.4 Auth

Purpose:

1. User signup
2. User login
3. Password reset
4. Session management
5. Business access control

Recommended option:

1. Supabase Auth

Access pattern:

1. User logs in.
2. Backend receives authenticated user identity.
3. Backend checks business_users.
4. Backend allows or rejects business data access.

## 2.5 Twilio Voice

Purpose:

1. Own or assign AI phone numbers.
2. Receive inbound calls.
3. Stream call audio to backend.
4. Transfer calls to a human if needed.

Flow:

1. Caller calls Twilio number.
2. Twilio sends webhook to backend.
3. Backend identifies business from called number.
4. Backend returns TwiML to start audio stream.
5. Twilio streams audio to backend WebSocket.
6. Backend bridges audio to OpenAI Realtime.

## 2.6 OpenAI Realtime

Purpose:

1. AI answers caller by voice.
2. AI collects call information.
3. AI calls backend tools to create records.
4. AI produces call summary.

The OpenAI connection should be server side. The browser should not directly handle production phone calls.

## 2.7 Stripe

Purpose:

1. Subscription checkout
2. Subscription status
3. Billing portal
4. Future invoice payments
5. Future customer payments

Flow:

1. User selects plan.
2. Backend creates Stripe Checkout session.
3. User pays on Stripe Checkout.
4. Stripe sends webhook.
5. Backend updates subscription.
6. User gets access based on subscription status.

## 2.8 SMS notifications

Purpose:

1. Alert owner when appointment is booked.
2. Alert owner for emergency calls.
3. Alert owner for human follow up.
4. Alert owner for AI failure if needed.

Provider:

1. Twilio SMS

All SMS messages should be stored in notifications table.

## 3. High level system flow

## 3.1 Client onboarding flow

```text
User signs up
↓
User creates business
↓
User adds services, hours, booking rules, notification phone
↓
User chooses subscription plan
↓
Stripe Checkout confirms payment
↓
Business becomes active
↓
Twilio number is assigned
↓
Business can receive AI calls
```

## 3.2 Inbound call flow

```text
Caller calls business AI number
↓
Twilio sends inbound call webhook
↓
Backend finds phone_numbers record
↓
Backend gets business_id
↓
Backend checks subscription status
↓
Backend creates call record
↓
Backend returns TwiML with media stream
↓
Twilio opens WebSocket to backend
↓
Backend opens OpenAI Realtime session
↓
AI talks to caller
↓
AI creates contact, address, lead, job, appointment
↓
Backend sends SMS notification
↓
Backend stores transcript and summary
↓
Backend records usage events
```

## 3.3 Appointment booking flow

```text
AI gathers caller information
↓
AI checks services, hours, booking rules, and availability
↓
AI confirms time with caller
↓
Backend creates or updates contact
↓
Backend creates address if needed
↓
Backend creates lead
↓
Backend creates job
↓
Backend creates appointment
↓
Backend sends owner SMS
↓
Dashboard updates
```

## 3.4 Billing flow

```text
User clicks subscribe
↓
Backend creates Stripe Checkout session
↓
User pays through Stripe
↓
Stripe sends webhook
↓
Backend stores subscription status
↓
Business gains access
```

## 4. Backend module boundaries

Use modules inside the backend.

Recommended modules:

1. auth
2. users
3. businesses
4. contacts
5. leads
6. appointments
7. jobs
8. calls
9. ai_agent
10. phone_numbers
11. notifications
12. billing
13. usage
14. webhooks
15. admin

Each module should contain:

1. Routes
2. Services
3. Repository or database functions
4. Schemas
5. Tests

Example structure:

```text
backend/
  app/
    modules/
      businesses/
        routes.py
        service.py
        repository.py
        schemas.py
      calls/
        routes.py
        service.py
        repository.py
        schemas.py
      billing/
        routes.py
        service.py
        stripe_provider.py
        schemas.py
```

## 5. Service layer pattern

Do not put business logic directly inside API routes.

Preferred flow:

```text
API route
↓
Service function
↓
Repository function
↓
Database
```

Example:

```text
POST /appointments
↓
appointment_service.create_appointment()
↓
appointment_repository.insert_appointment()
```

Why:

1. Easier to test
2. Easier to reuse logic from AI tools
3. Easier to keep frontend simple
4. Easier to change providers later

## 6. Provider wrapper pattern

External providers should be wrapped behind internal interfaces.

Examples:

1. billing_provider.create_checkout_session()
2. billing_provider.create_portal_session()
3. sms_provider.send_sms()
4. voice_provider.start_call_stream()
5. ai_provider.create_realtime_session()

Do not scatter Twilio, Stripe, and OpenAI calls everywhere in the codebase.

## 7. Multi tenant access control

Every business owned record must have business_id.

API access should follow this rule:

```text
Authenticated user
↓
Find business access in business_users
↓
Check role
↓
Allow or deny action
```

Example:

1. User requests GET /businesses/abc/contacts.
2. Backend checks if user belongs to business abc.
3. If yes, return contacts where business_id is abc.
4. If no, return forbidden.

Never trust business_id from frontend without backend verification.

## 8. Webhook processing architecture

Webhooks should be idempotent.

Process:

1. Receive webhook.
2. Verify provider signature.
3. Read provider event ID.
4. Check webhook_events table.
5. If already processed, return success.
6. If not processed, run handler.
7. Store event as processed.

Providers:

1. Stripe
2. Twilio

This prevents duplicate subscription updates, duplicate SMS records, duplicate calls, and duplicate payment events.

## 9. Event and audit strategy

The system should log important events.

Call events:

1. call_started
2. ai_connected
3. contact_created
4. lead_created
5. job_created
6. appointment_booked
7. sms_sent
8. call_ended
9. error_occurred

Usage events:

1. call_started
2. call_minute
3. sms_sent
4. appointment_booked
5. ai_audio_input_seconds
6. ai_audio_output_seconds
7. human_transfer

Audit logs can be added later for manual user actions.

## 10. Subscription gating

Backend should check subscription status before allowing paid features.

Feature checks:

1. Can business receive AI calls?
2. Can business send SMS?
3. Can business create more users?
4. Can business add more phone numbers?
5. Is business over monthly usage limit?

Subscription status should come from database, which is updated by Stripe webhooks.

Do not trust frontend subscription state.

## 11. Error handling

Important failure cases:

1. Twilio call cannot connect.
2. OpenAI Realtime session fails.
3. AI tool call fails.
4. Appointment creation fails.
5. SMS sending fails.
6. Stripe webhook fails.
7. Business has inactive subscription.
8. Unknown phone number receives call.

Expected behavior:

1. Save error event.
2. Do not expose another business data.
3. Notify admin if serious.
4. If possible, transfer call to human number.

## 12. Hosting architecture

Recommended early hosting:

Frontend:

1. Vercel
2. Netlify
3. Cloudflare Pages

Backend:

1. Railway
2. Render
3. Fly.io
4. DigitalOcean App Platform

Database:

1. Supabase Postgres

Requirements:

1. Backend must support WebSockets.
2. Backend must support long lived connections for call streaming.
3. Environment variables must be separated by local, staging, and production.
4. Twilio and Stripe webhooks should point to production or staging backend URLs.

## 13. Environment separation

Use three environments:

1. local
2. staging
3. production

Each environment needs separate:

1. Database
2. Supabase keys
3. Stripe keys
4. Twilio numbers
5. OpenAI keys
6. Webhook URLs

Do not test risky changes on production data.

## 14. Security notes

Required:

1. Verify Twilio webhook signatures.
2. Verify Stripe webhook signatures.
3. Store secrets only in environment variables.
4. Never expose OpenAI, Twilio, Stripe secret keys to frontend.
5. Scope all tenant data by business_id.
6. Use Row Level Security if frontend talks directly to Supabase.
7. Limit admin access.
8. Log failed authorization attempts.

## 15. Future integrations

The architecture should allow these later:

1. Google Calendar
2. Outlook Calendar
3. Jobber
4. Housecall Pro
5. ServiceTitan
6. Zapier
7. Customer payment portal
8. Customer reminder SMS
9. Technician scheduling
10. Customer web booking
