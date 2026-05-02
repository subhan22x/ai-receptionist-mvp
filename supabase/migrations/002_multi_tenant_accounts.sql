-- v0.2 multi-tenant account foundation.
-- Tenant enforcement is handled by the FastAPI backend in this release.

create extension if not exists "pgcrypto";

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  personal_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  business_name text not null,
  industry text,
  timezone text default 'America/Chicago',
  service_area text,
  business_address text,
  business_city text,
  business_state text,
  business_zip text,
  business_website text,
  business_phone text,
  notification_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  constraint business_users_role_check check (role in ('owner', 'admin', 'staff')),
  constraint business_users_business_user_key unique (business_id, user_id)
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  category text,
  description text,
  default_duration_minutes integer default 60,
  is_emergency_service boolean default false,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  day_of_week integer not null,
  open_time time,
  close_time time,
  is_closed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hours_day_check check (day_of_week between 0 and 6),
  constraint business_hours_business_day_key unique (business_id, day_of_week)
);

create table if not exists booking_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  appointment_duration_minutes integer default 60,
  minimum_notice_minutes integer default 120,
  max_days_ahead integer default 30,
  allow_same_day_booking boolean default true,
  allow_emergency_after_hours boolean default true,
  buffer_minutes_between_jobs integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_rules_business_key unique (business_id)
);

create table if not exists ai_agents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text default 'AI Receptionist',
  voice text,
  greeting text,
  base_instructions text,
  tone text default 'professional',
  language text default 'en',
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_agents_business_key unique (business_id)
);

create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sms_enabled boolean default true,
  email_enabled boolean default false,
  notify_on_booking boolean default true,
  notify_on_emergency boolean default true,
  notify_on_missed_call boolean default true,
  notify_on_human_follow_up boolean default true,
  notification_phone text,
  notification_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_business_key unique (business_id)
);

alter table customers
  add column if not exists business_id uuid references businesses(id) on delete cascade;

alter table appointments
  add column if not exists business_id uuid references businesses(id) on delete cascade;

alter table calls
  add column if not exists business_id uuid references businesses(id) on delete cascade;

create index if not exists businesses_owner_user_id_idx
  on businesses (owner_user_id);

create index if not exists business_users_user_id_idx
  on business_users (user_id);

create index if not exists business_users_business_id_idx
  on business_users (business_id);

create index if not exists services_business_id_idx
  on services (business_id);

create index if not exists business_hours_business_id_idx
  on business_hours (business_id);

create index if not exists booking_rules_business_id_idx
  on booking_rules (business_id);

create index if not exists ai_agents_business_id_idx
  on ai_agents (business_id);

create index if not exists notification_preferences_business_id_idx
  on notification_preferences (business_id);

create index if not exists customers_business_id_idx
  on customers (business_id);

create index if not exists appointments_business_id_idx
  on appointments (business_id);

create index if not exists calls_business_id_idx
  on calls (business_id);
