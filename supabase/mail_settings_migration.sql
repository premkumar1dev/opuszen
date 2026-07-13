-- ============================================================
-- Supabase migration: create mail_settings table
-- Run this in your Supabase SQL Editor
-- ============================================================

create table if not exists public.mail_settings (
  id            uuid primary key default gen_random_uuid(),
  from_name     text             not null,
  from_email    text             not null,
  smtp_email    text             not null,
  smtp_password text             not null,  -- AES-256-GCM encrypted
  smtp_host     text             not null,
  smtp_port     integer          not null default 587,
  smtp_protocol text             not null default 'tls' check (smtp_protocol in ('tls','ssl')),
  created_at    timestamptz      not null default now(),
  updated_at    timestamptz      not null default now()
);

-- Only one active SMTP config (partial unique index — at most one row)
create unique index if not exists mail_settings_singleton
  on public.mail_settings ((true));

-- Enable Row Level Security
alter table public.mail_settings enable row level security;

-- Admins (service-role key) can do everything;
-- anon/authenticated users are blocked by default.
-- If you use the service-role key on the server, no policy is needed.
-- Uncomment below if you use the publishable key server-side:
-- create policy "admin_full_access" on public.mail_settings
--   for all using (auth.role() = 'service_role');

comment on table public.mail_settings is 'Stores SMTP configuration for outbound email. Only one row allowed. Password is encrypted with AES-256-GCM.';
