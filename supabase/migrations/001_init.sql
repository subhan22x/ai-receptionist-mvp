-- AI Receptionist MVP — initial schema
-- All timestamps stored in UTC. Appointment date/time stored as wall-clock
-- America/Chicago values (the demo's local timezone).

create extension if not exists "pgcrypto";

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

create index if not exists customers_created_at_idx
  on customers (created_at desc);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  title text not null,
  service_type text,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'booked',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists appointments_date_time_idx
  on appointments (appointment_date, start_time);

create index if not exists appointments_customer_idx
  on appointments (customer_id);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  session_id text,
  caller_name text,
  caller_phone text,
  transcript text,
  summary text,
  reason_for_call text,
  preferred_time text,
  reminder_preference text,
  needs_human_follow_up boolean not null default false,
  is_emergency boolean not null default false,
  handled_by text not null default 'AI Receptionist',
  created_at timestamptz not null default now()
);

create index if not exists calls_created_at_idx
  on calls (created_at desc);

create index if not exists calls_customer_idx
  on calls (customer_id);
