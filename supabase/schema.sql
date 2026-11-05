-- PACE Camotes bookings
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.bookings (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 1 and 80),
  phone              text not null default '' check (char_length(phone) <= 80),
  format             text not null,
  date               date not null,
  time               text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  note               text not null default '' check (char_length(note) <= 200),
  source             text not null default 'Website',
  kind               text not null default 'booking' check (kind in ('booking', 'openplay')),
  status             text not null default 'pending'
                     check (status in ('pending', 'approved', 'declined', 'cancelled')),
  court              smallint check (court >= 1),
  cancelled_by_guest boolean not null default false,
  staff_note         text not null default '' check (char_length(staff_note) <= 1000),
  token_hash         text not null,
  created_at         timestamptz not null default now(),
  decided_at         timestamptz,
  -- an approved booking always has a court; any other status never holds one
  constraint court_only_when_approved check ((status = 'approved') = (court is not null))
);

-- If you ran an earlier version of this file, this adds the new column (safe to run again).
alter table public.bookings add column if not exists kind text not null default 'booking'
  check (kind in ('booking', 'openplay'));

-- The double-booking guard: one approved booking per court per hour.
create unique index if not exists bookings_one_per_court
  on public.bookings (date, time, court) where status = 'approved';

create index if not exists bookings_date_idx on public.bookings (date, time);
create index if not exists bookings_phone_idx on public.bookings (phone);

-- Lock the table: no access with the public (anon) key. Only the server, using the
-- service-role key from Vercel's environment variables, can read or write bookings.
alter table public.bookings enable row level security;
revoke all on public.bookings from anon, authenticated;
