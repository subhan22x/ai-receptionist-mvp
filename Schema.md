# Schema

# AI Receptionist SaaS Database Schema

## 1. Schema principles

This database is designed for a multi tenant SaaS.

Main rule:

Every business owned table must include business_id.

This keeps each client business separated.

Recommended common fields:

1. id
2. business_id when tenant owned
3. created_at
4. updated_at

Use UUIDs for primary keys where possible.

## 2. Entity overview

Main entities:

1. users
2. businesses
3. business_users
4. contacts
5. contact_addresses
6. leads
7. appointments
8. jobs
9. calls
10. call_events
11. services
12. business_hours
13. booking_rules
14. phone_numbers
15. call_routing_rules
16. ai_agents
17. notification_preferences
18. notifications
19. plans
20. subscriptions
21. usage_events
22. webhook_events
23. invoices
24. invoice_items
25. payments

## 3. users

Stores the person who logs into the web app.

```sql
users
id uuid primary key
email text not null unique
full_name text
personal_phone text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Notes:

1. If using Supabase Auth, this table can be a profile table linked to auth.users.
2. The user is not the same as the business.
3. One user can access many businesses through business_users.

## 4. businesses

Stores the client company using the AI receptionist.

```sql
businesses
id uuid primary key
owner_user_id uuid references users(id)
business_name text not null
industry text
timezone text not null default 'America/Chicago'
service_area text
business_address text
business_city text
business_state text
business_zip text
business_website text
business_phone text
notification_phone text
subscription_status text default 'inactive'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Notes:

1. Business is the tenant.
2. Most records in the system belong to a business.
3. subscription_status can be cached here for quick checks, but subscriptions remains the source of truth.

## 5. business_users

Maps users to businesses.

```sql
business_users
id uuid primary key
business_id uuid not null references businesses(id)
user_id uuid not null references users(id)
role text not null default 'owner'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
unique(business_id, user_id)
```

Role values:

1. owner
2. manager
3. staff
4. admin_viewer

Notes:

1. This table allows one business to have multiple users.
2. This table allows one user to manage multiple businesses.

## 6. contacts

Stores the customer who called the business.

```sql
contacts
id uuid primary key
business_id uuid not null references businesses(id)
full_name text
phone text
email text
company_name text
notes text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Recommended indexes:

```sql
index contacts_business_id_idx on contacts(business_id)
index contacts_business_phone_idx on contacts(business_id, phone)
```

Notes:

1. A contact can have many service addresses.
2. A contact can have many calls, leads, jobs, appointments, invoices, and payments.

## 7. contact_addresses

Stores service addresses for contacts.

```sql
contact_addresses
id uuid primary key
business_id uuid not null references businesses(id)
contact_id uuid not null references contacts(id)
label text default 'primary'
street text
city text
state text
zip text
is_primary boolean not null default false
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Notes:

1. Do not store only one address on contacts.
2. Home service businesses may serve property managers with many addresses.

## 8. leads

Stores potential business opportunities from calls, manual entry, website forms, or referrals.

```sql
leads
id uuid primary key
business_id uuid not null references businesses(id)
contact_id uuid references contacts(id)
call_id uuid
status text not null default 'new'
source text not null default 'ai_call'
service_requested text
service_id uuid references services(id)
urgency text default 'normal'
address_id uuid references contact_addresses(id)
summary text
estimated_value numeric(12,2)
assigned_to_user_id uuid references users(id)
follow_up_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Lead statuses:

1. new
2. qualified
3. appointment_booked
4. needs_follow_up
5. not_serviceable
6. lost
7. spam
8. closed

Sources:

1. ai_call
2. manual
3. website
4. referral
5. repeat_customer

## 9. appointments

Stores scheduled visits.

```sql
appointments
id uuid primary key
business_id uuid not null references businesses(id)
contact_id uuid references contacts(id)
lead_id uuid references leads(id)
job_id uuid references jobs(id)
service_id uuid references services(id)
assigned_staff_id uuid
service_address_id uuid references contact_addresses(id)
title text
status text not null default 'booked'
appointment_date date
start_time timestamptz
end_time timestamptz
notes text
created_by text default 'ai'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Appointment statuses:

1. booked
2. confirmed
3. rescheduled
4. completed
5. cancelled
6. no_show

Notes:

1. An appointment is a scheduled visit.
2. A job can have many appointments.
3. Appointments should follow business hours and booking rules.

## 10. jobs

Stores the actual work or service request.

```sql
jobs
id uuid primary key
business_id uuid not null references businesses(id)
contact_id uuid references contacts(id)
lead_id uuid references leads(id)
primary_address_id uuid references contact_addresses(id)
job_number text
title text
service_id uuid references services(id)
status text not null default 'new'
priority text default 'normal'
job_source text default 'ai_call'
description text
internal_notes text
customer_notes text
estimated_value numeric(12,2)
final_value numeric(12,2)
scheduled_start_at timestamptz
scheduled_end_at timestamptz
completed_at timestamptz
cancelled_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Job statuses:

1. new
2. scheduled
3. in_progress
4. waiting_on_customer
5. waiting_on_parts
6. completed
7. cancelled
8. lost

Priority values:

1. low
2. normal
3. high
4. emergency

Notes:

1. Jobs are added now because invoices will later be created from jobs.
2. A job can have one or many appointments.
3. A job can have one or many invoices later.

## 11. calls

Stores phone call records.

```sql
calls
id uuid primary key
business_id uuid not null references businesses(id)
contact_id uuid references contacts(id)
lead_id uuid references leads(id)
job_id uuid references jobs(id)
appointment_id uuid references appointments(id)
twilio_call_sid text unique
from_number text
to_number text
direction text default 'inbound'
status text default 'started'
duration_seconds integer default 0
recording_url text
transcript text
summary text
call_outcome text
ai_confidence_score numeric(5,2)
needs_human_review boolean not null default false
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Call outcomes:

1. appointment_booked
2. lead_created
3. job_created
4. customer_question
5. emergency
6. human_transfer
7. missed
8. voicemail
9. spam
10. failed

Call statuses:

1. started
2. in_progress
3. completed
4. failed
5. transferred

## 12. call_events

Stores timeline events for each call.

```sql
call_events
id uuid primary key
business_id uuid not null references businesses(id)
call_id uuid not null references calls(id)
event_type text not null
event_payload jsonb
created_at timestamptz not null default now()
```

Event examples:

1. call_started
2. ai_connected
3. contact_identified
4. contact_created
5. lead_created
6. job_created
7. appointment_requested
8. appointment_booked
9. sms_sent
10. call_ended
11. error_occurred

Notes:

1. This table is critical for debugging.
2. It helps explain what happened during a call.

## 13. services

Stores services offered by each business.

```sql
services
id uuid primary key
business_id uuid not null references businesses(id)
name text not null
category text
description text
default_duration_minutes integer default 60
is_emergency_service boolean not null default false
is_active boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Examples:

1. Drain cleaning
2. Water heater repair
3. Gas leak repair
4. Sewer inspection
5. Toilet repair

## 14. business_hours

Stores weekly hours.

```sql
business_hours
id uuid primary key
business_id uuid not null references businesses(id)
day_of_week integer not null
open_time time
close_time time
is_closed boolean not null default false
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Day of week convention:

1. 0 Sunday
2. 1 Monday
3. 2 Tuesday
4. 3 Wednesday
5. 4 Thursday
6. 5 Friday
7. 6 Saturday

## 15. booking_rules

Stores appointment rules.

```sql
booking_rules
id uuid primary key
business_id uuid not null references businesses(id)
appointment_duration_minutes integer not null default 60
minimum_notice_minutes integer not null default 120
max_days_ahead integer not null default 30
allow_same_day_booking boolean not null default true
allow_emergency_after_hours boolean not null default false
buffer_minutes_between_jobs integer not null default 0
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Notes:

1. AI must respect booking rules.
2. Emergency calls may use different behavior.

## 16. phone_numbers

Stores AI phone numbers assigned to businesses.

```sql
phone_numbers
id uuid primary key
business_id uuid not null references businesses(id)
twilio_number text not null unique
friendly_name text
forwarding_number text
status text not null default 'active'
sms_enabled boolean not null default true
voice_enabled boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Statuses:

1. active
2. inactive
3. released
4. pending

Notes:

1. Incoming calls are mapped to business_id through this table.
2. A business can have more than one phone number later.

## 17. call_routing_rules

Stores how calls should be handled.

```sql
call_routing_rules
id uuid primary key
business_id uuid not null references businesses(id)
mode text not null default 'ai_first'
human_forwarding_number text
transfer_on_emergency boolean not null default true
transfer_on_customer_request boolean not null default true
transfer_on_ai_low_confidence boolean not null default true
after_hours_behavior text default 'ai_answer'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Modes:

1. ai_first
2. missed_call_backup
3. after_hours_only
4. human_first_then_ai

After hours behavior:

1. ai_answer
2. voicemail
3. transfer_to_human
4. emergency_only

## 18. ai_agents

Stores AI receptionist configuration.

```sql
ai_agents
id uuid primary key
business_id uuid not null references businesses(id)
name text default 'AI Receptionist'
voice text
greeting text
base_instructions text
tone text default 'professional'
language text default 'en'
is_active boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Notes:

1. Prompt should be built dynamically from business profile, services, hours, rules, and ai_agents.
2. Prompt versioning can be added later.

## 19. notification_preferences

Stores when and how a business wants alerts.

```sql
notification_preferences
id uuid primary key
business_id uuid not null references businesses(id)
sms_enabled boolean not null default true
email_enabled boolean not null default false
notify_on_booking boolean not null default true
notify_on_emergency boolean not null default true
notify_on_missed_call boolean not null default true
notify_on_human_follow_up boolean not null default true
notification_phone text
notification_email text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

## 20. notifications

Stores sent and failed notifications.

```sql
notifications
id uuid primary key
business_id uuid not null references businesses(id)
contact_id uuid references contacts(id)
appointment_id uuid references appointments(id)
call_id uuid references calls(id)
job_id uuid references jobs(id)
channel text not null
recipient text not null
message text not null
status text not null default 'pending'
provider_message_id text
error_message text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Channels:

1. sms
2. email
3. push
4. webhook

Statuses:

1. pending
2. sent
3. failed
4. delivered

## 21. plans

Stores product plans.

```sql
plans
id uuid primary key
name text not null
stripe_price_id text unique
monthly_price numeric(12,2)
included_calls integer default 0
included_sms integer default 0
max_businesses integer default 1
max_users integer default 1
max_phone_numbers integer default 1
is_active boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Example plans:

1. Starter
2. Growth
3. Pro

## 22. subscriptions

Stores subscription state from Stripe.

```sql
subscriptions
id uuid primary key
business_id uuid not null references businesses(id)
plan_id uuid references plans(id)
stripe_customer_id text
stripe_subscription_id text unique
stripe_price_id text
status text not null default 'inactive'
current_period_start timestamptz
current_period_end timestamptz
cancel_at_period_end boolean not null default false
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Statuses:

1. trialing
2. active
3. past_due
4. canceled
5. unpaid
6. incomplete

Notes:

1. Subscription state should be updated by Stripe webhooks.
2. Backend should check this before allowing AI call features.

## 23. usage_events

Stores billable and operational usage.

```sql
usage_events
id uuid primary key
business_id uuid not null references businesses(id)
event_type text not null
quantity numeric(12,2) not null default 1
metadata jsonb
created_at timestamptz not null default now()
```

Event types:

1. call_started
2. call_minute
3. sms_sent
4. appointment_booked
5. lead_created
6. job_created
7. human_transfer
8. ai_audio_input_seconds
9. ai_audio_output_seconds

Notes:

1. Use this for plan limits and cost monitoring.
2. Usage should be queryable by month.

## 24. webhook_events

Stores provider webhook events to prevent duplicate processing.

```sql
webhook_events
id uuid primary key
provider text not null
provider_event_id text not null
event_type text
business_id uuid references businesses(id)
payload jsonb
processed_at timestamptz
created_at timestamptz not null default now()
unique(provider, provider_event_id)
```

Providers:

1. stripe
2. twilio

Notes:

1. Always check this before processing a webhook.
2. This prevents duplicate payments, duplicate subscription changes, and duplicate call actions.

## 25. invoices

Stores invoices created from jobs.

```sql
invoices
id uuid primary key
business_id uuid not null references businesses(id)
job_id uuid references jobs(id)
contact_id uuid references contacts(id)
invoice_number text
status text not null default 'draft'
subtotal_amount numeric(12,2) not null default 0
tax_amount numeric(12,2) not null default 0
discount_amount numeric(12,2) not null default 0
total_amount numeric(12,2) not null default 0
amount_paid numeric(12,2) not null default 0
amount_due numeric(12,2) not null default 0
currency text not null default 'usd'
due_date date
sent_at timestamptz
paid_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Invoice statuses:

1. draft
2. sent
3. partially_paid
4. paid
5. overdue
6. void
7. refunded

Notes:

1. Invoices connect to jobs, not only appointments.
2. This supports jobs with multiple visits.

## 26. invoice_items

Stores line items on invoices.

```sql
invoice_items
id uuid primary key
business_id uuid not null references businesses(id)
invoice_id uuid not null references invoices(id)
service_id uuid references services(id)
description text not null
quantity numeric(12,2) not null default 1
unit_price numeric(12,2) not null default 0
total_price numeric(12,2) not null default 0
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Notes:

1. total_price should equal quantity multiplied by unit_price.
2. Invoice totals should be recalculated when items change.

## 27. payments

Stores payment records for invoices.

```sql
payments
id uuid primary key
business_id uuid not null references businesses(id)
invoice_id uuid references invoices(id)
job_id uuid references jobs(id)
contact_id uuid references contacts(id)
stripe_payment_intent_id text
payment_method text
status text not null default 'pending'
amount numeric(12,2) not null
currency text not null default 'usd'
paid_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Payment statuses:

1. pending
2. succeeded
3. failed
4. refunded
5. partially_refunded

## 28. Main relationships

```text
users to business_users: one to many
businesses to business_users: one to many
businesses to contacts: one to many
contacts to contact_addresses: one to many
contacts to leads: one to many
contacts to calls: one to many
contacts to jobs: one to many
contacts to appointments: one to many
leads to jobs: one to many or one to one depending on product rules
jobs to appointments: one to many
jobs to invoices: one to many
invoices to invoice_items: one to many
invoices to payments: one to many
businesses to phone_numbers: one to many
businesses to services: one to many
businesses to usage_events: one to many
calls to call_events: one to many
```

## 29. Important indexes

Recommended indexes:

```sql
create index contacts_business_id_idx on contacts(business_id);
create index contacts_business_phone_idx on contacts(business_id, phone);
create index leads_business_id_idx on leads(business_id);
create index appointments_business_start_time_idx on appointments(business_id, start_time);
create index jobs_business_status_idx on jobs(business_id, status);
create index calls_business_created_idx on calls(business_id, created_at);
create index call_events_call_id_idx on call_events(call_id);
create index usage_events_business_created_idx on usage_events(business_id, created_at);
create index notifications_business_created_idx on notifications(business_id, created_at);
create index invoices_business_status_idx on invoices(business_id, status);
```

## 30. Data access rules

Rules:

1. A user can only access a business if a business_users record exists.
2. Tenant owned records must be filtered by business_id.
3. Admin access should be separate from business owner access.
4. Webhook handlers should identify business from provider data, not from frontend input.
5. Calls should identify business from phone_numbers.to_number.
6. Stripe events should identify business from subscription or customer mapping.

## 31. Future tables

Add later when needed:

1. staff_members
2. appointment_status_history
3. job_status_history
4. ai_prompt_versions
5. knowledge_base_items
6. integrations
7. integration_sync_logs
8. audit_logs
9. custom_fields
10. tags
11. tasks
12. customer_messages
