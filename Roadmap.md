# Roadmap

# AI Receptionist SaaS Roadmap

## Product direction

The product starts as an AI receptionist for small home service businesses. It should answer calls, create contacts, qualify leads, book appointments, create jobs, send SMS alerts, and show activity inside a client dashboard.

The long term direction is a lightweight operating system for local service businesses. The system can later support invoices, payments, customer reminders, integrations, staff scheduling, and job management.

## Build principle

Build the foundation first. Do not start with phone calls before account management, tenant security, billing, and business settings are ready.

Correct order:

1. Database
2. Auth
3. Tenant security
4. Business onboarding
5. Dashboard
6. Billing
7. Twilio phone calls
8. AI call handling
9. SMS alerts
10. Jobs
11. Invoices
12. Payments

## Phase 1: Database foundation

Goal: Create the core data model for a multi tenant SaaS.

Deliverables:

1. Create users table or connect Supabase Auth users to profiles.
2. Create businesses table.
3. Create business_users table.
4. Add business_id to every tenant owned table.
5. Create contacts and contact_addresses.
6. Create leads.
7. Create appointments.
8. Create jobs.
9. Create calls and call_events.
10. Create services, business_hours, and booking_rules.
11. Create phone_numbers and call_routing_rules.
12. Create ai_agents.
13. Create notification_preferences and notifications.
14. Create plans, subscriptions, usage_events, and webhook_events.
15. Create invoices, invoice_items, and payments for future expansion.

Exit criteria:

1. Schema exists in migration files.
2. Tables have created_at and updated_at.
3. Tenant owned tables have business_id.
4. Basic seed data can be loaded for one demo business.

## Phase 2: Auth and account management

Goal: Let a client create an account and log in.

Deliverables:

1. Signup page
2. Login page
3. Logout
4. Password reset
5. User profile page
6. Business creation after signup
7. Role assignment through business_users

Exit criteria:

1. New user can sign up.
2. New user can create a business.
3. User is assigned as owner of that business.
4. User can log out and log back in.

## Phase 3: Tenant security

Goal: Make sure each business only sees its own data.

Deliverables:

1. Backend business access check.
2. API route guard for business_id.
3. Supabase Row Level Security policies if using Supabase directly from frontend.
4. Tests for tenant isolation.
5. Admin bypass rules for internal admin only.

Exit criteria:

1. User from Business A cannot access Business B data.
2. All core API queries are scoped by business_id.
3. Unauthorized requests fail safely.

## Phase 4: Business onboarding

Goal: Collect all settings needed before the AI can answer calls.

Deliverables:

1. Business profile form
2. Business address form
3. Website field
4. Business phone field
5. Personal phone field
6. Notification phone field
7. Timezone selector
8. Service area field
9. Services setup
10. Business hours setup
11. Booking rules setup
12. AI greeting and behavior setup

Exit criteria:

1. Business owner can complete onboarding.
2. Business profile is saved.
3. AI settings can be generated from business data.

## Phase 5: Dashboard shell

Goal: Create the main client dashboard.

Pages:

1. Dashboard
2. Calendar
3. Contacts
4. Leads
5. Jobs
6. Calls
7. Settings
8. Billing

Dashboard widgets:

1. Calls today
2. Leads today
3. Appointments today
4. Jobs created today
5. Emergency calls
6. Human follow ups needed
7. Failed calls
8. Monthly usage

Exit criteria:

1. Authenticated business owner can navigate dashboard.
2. Dashboard shows tenant scoped data.
3. Empty states are clean and understandable.

## Phase 6: CRM records

Goal: Let the system and user manage customer records.

Deliverables:

1. Contact list
2. Contact detail page
3. Contact creation
4. Contact editing
5. Contact addresses
6. Lead list
7. Lead detail page
8. Appointment list
9. Appointment detail page
10. Job list
11. Job detail page
12. Call list
13. Call detail page

Exit criteria:

1. User can view contacts, addresses, leads, appointments, jobs, and calls.
2. Records are linked together properly.
3. A contact page shows related calls, leads, appointments, and jobs.

## Phase 7: Stripe billing

Goal: Let clients subscribe, pay, manage billing, and cancel.

Deliverables:

1. Plans table seeded with initial plans.
2. Stripe products and prices created.
3. Checkout session endpoint.
4. Stripe webhook endpoint.
5. Subscription table updates from webhook.
6. Billing page.
7. Stripe Customer Portal link.
8. Subscription status checks in backend.

Exit criteria:

1. User can choose a plan.
2. User can pay through Stripe Checkout.
3. Webhook activates subscription.
4. User can open Stripe Customer Portal.
5. User can cancel subscription.
6. App reflects subscription status correctly.

## Phase 8: Usage tracking

Goal: Track cost and plan limits from day one.

Events to track:

1. call_started
2. call_minute
3. sms_sent
4. appointment_booked
5. lead_created
6. job_created
7. human_transfer
8. ai_audio_input_seconds
9. ai_audio_output_seconds

Deliverables:

1. usage_events table integration.
2. Monthly usage query.
3. Usage shown on billing page.
4. Plan limit checks.

Exit criteria:

1. Usage is recorded when system actions happen.
2. Billing page shows current month usage.
3. Backend can decide whether a business is over limit.

## Phase 9: Twilio phone number setup

Goal: Connect real phone calls to the correct business.

Deliverables:

1. Twilio number purchase or manual assignment process.
2. phone_numbers table integration.
3. Inbound voice webhook.
4. Twilio signature verification.
5. Business lookup by called number.
6. Basic call response.
7. Call records saved.

Exit criteria:

1. Twilio call reaches backend.
2. Backend identifies business by number.
3. Call record is created.
4. Unknown numbers fail safely.

## Phase 10: OpenAI Realtime call bridge

Goal: Let AI answer phone calls.

Deliverables:

1. WebSocket endpoint for Twilio Media Streams.
2. Server side OpenAI Realtime connection.
3. Audio bridge between Twilio and OpenAI.
4. Dynamic AI prompt from business settings.
5. Tool calls for contact, lead, appointment, job, and notification creation.
6. Call transcript and summary save.
7. Error handling and fallback behavior.

Exit criteria:

1. Caller can speak to AI over phone.
2. AI uses correct business profile.
3. AI creates records through backend tools.
4. Call summary appears in dashboard.

## Phase 11: SMS notifications

Goal: Alert the business owner when important events happen.

Deliverables:

1. SMS provider wrapper.
2. Notification preference checks.
3. SMS on appointment booked.
4. SMS on emergency call.
5. SMS on human follow up.
6. Notification records saved.
7. Failed SMS handling.

Exit criteria:

1. Owner receives SMS after appointment booking.
2. Notification record is saved.
3. Failed SMS is visible to admin.

## Phase 12: Admin dashboard

Goal: Give internal operators visibility and support tools.

Admin pages:

1. Businesses
2. Subscriptions
3. Phone numbers
4. Calls
5. Failed calls
6. Failed notifications
7. Webhook events
8. Usage
9. Errors

Exit criteria:

1. Admin can inspect client accounts.
2. Admin can debug failed calls and webhooks.
3. Admin can see usage and billing status.

## Phase 13: Invoice foundation

Goal: Prepare jobs to become billable work.

Deliverables:

1. Invoice list
2. Invoice detail page
3. Create invoice from job
4. Add invoice items
5. Calculate subtotal, tax, discount, total, amount paid, and amount due
6. Invoice statuses
7. Payment records

Exit criteria:

1. Business can create draft invoice from job.
2. Invoice can have items.
3. Invoice totals calculate correctly.
4. Payment record can be stored manually or by Stripe later.

## Phase 14: Payment collection

Goal: Let businesses collect payment from customers.

Deliverables:

1. Stripe payment link or invoice payment flow.
2. Payment intent creation.
3. Payment webhook.
4. Payment status update.
5. Invoice status update after payment.

Exit criteria:

1. Customer can pay invoice.
2. Payment is linked to invoice, job, contact, and business.
3. Invoice becomes paid when payment succeeds.

## Launch version

Minimum sellable version:

1. Signup
2. Business onboarding
3. Stripe subscription
4. AI phone number
5. AI call answering
6. Contact creation
7. Lead creation
8. Job creation
9. Appointment booking
10. SMS alerts
11. Dashboard stats
12. Calendar
13. Calls page
14. Jobs page
15. Billing page
16. Admin dashboard

## Version two

1. Invoices
2. Customer payments
3. Customer confirmation texts
4. Google Calendar sync
5. Staff assignment
6. Call review queue
7. Knowledge base editor
8. Advanced plan limits

## Version three

1. Jobber integration
2. Housecall Pro integration
3. ServiceTitan integration
4. Multi staff scheduling
5. Customer portal
6. Automated reminders
7. Advanced reporting
8. Custom AI workflows
