-- VAIRO: schema for the public site, CMS and CRM.
-- Roles: admin (everything), editor (content), agent (own listings as drafts + full CRM).

create extension if not exists pgcrypto;

-- ───────────────────────────── enums
create type public.staff_role as enum ('admin', 'editor', 'agent');
create type public.deal_type as enum ('sale', 'rent');
create type public.listing_status as enum ('draft', 'live', 'reserved', 'sold');
create type public.contact_stage as enum ('new', 'contacted', 'viewing', 'offer', 'closed');
create type public.contact_score as enum ('hot', 'warm', 'cold', 'won', 'lost');

-- ───────────────────────────── reference content
create table public.areas (
  id text primary key,
  name text not null,
  short text not null,
  vibe text not null default '',
  description text not null default '',
  ppm integer not null default 0 check (ppm >= 0),           -- avg sale price per m² (USD)
  rent numeric(6,2) not null default 0 check (rent >= 0),     -- avg rent per m² per month (USD)
  img text,
  x numeric(5,2) not null default 50 check (x between 0 and 100),  -- schematic map position (%)
  y numeric(5,2) not null default 50 check (y between 0 and 100),
  tags text[] not null default '{}',
  dna jsonb not null default '{"family":5,"convenience":5,"green":5,"dining":5,"growth":5,"quiet":5}',
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.developers (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  mono text not null default '',
  founded integer,
  focus text not null default '',
  delivered integer not null default 0,
  units integer not null default 0,
  description text not null default '',
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id text primary key,
  name text not null,
  name_en text,
  type text not null check (type in ('tower', 'compound', 'villas', 'mixed')),
  area_id text not null references public.areas(id) on update cascade,
  developer_id text not null references public.developers(id) on update cascade,
  status text not null default 'construction' check (status in ('construction', 'ready')),
  progress integer not null default 0 check (progress between 0 and 100),
  progress_updated_at timestamptz not null default now(),
  handover text not null default '',
  floors integer not null default 1,
  units integer not null default 0,
  img text,
  tagline text not null default '',
  amenities text[] not null default '{}',
  price_from integer not null default 0,
  plan_down integer not null default 0 check (plan_down between 0 and 100),
  plan_months integer not null default 0 check (plan_months >= 0),
  plan_handover integer not null default 0 check (plan_handover between 0 and 100),
  published boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plan_down + plan_handover <= 100)
);

-- Unit grid for the Tower Explorer.
create table public.project_units (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade on update cascade,
  floor integer not null,
  unit text not null,
  beds integer,
  size integer,
  price integer,
  status text not null default 'free' check (status in ('free', 'reserved', 'sold')),
  unique (project_id, floor, unit)
);

-- ───────────────────────────── staff
-- Public profile of a team member (shown on property pages when the "show agent" setting is on).
create table public.agents (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  title text not null default '',
  img text,
  phone text,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

-- Private account data: login link + role. Staff only.
create table public.staff (
  agent_id text primary key references public.agents(id) on delete cascade on update cascade,
  email text not null unique,
  role public.staff_role not null default 'agent',
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.staff (user_id);

-- ───────────────────────────── listings
create sequence public.listing_sale_seq start 1001;
create sequence public.listing_rent_seq start 5001;

create table public.listings (
  id text primary key,
  deal public.deal_type not null,
  type text not null check (type in ('apartment', 'penthouse', 'villa', 'house', 'land', 'office', 'shop', 'townhouse')),
  area_id text not null references public.areas(id) on update cascade,
  project_id text references public.projects(id) on delete set null on update cascade,
  agent_id text references public.agents(id) on delete set null on update cascade,
  status public.listing_status not null default 'draft',
  status_changed_at timestamptz not null default now(),
  featured boolean not null default false,
  featured_rank integer,
  verified boolean not null default true,
  hide_price boolean not null default false,
  -- specs
  beds integer, baths integer, size integer not null default 0, plot integer,
  floor integer, total_floors integer, floors integer, terrace integer, frontage integer,
  land_use text, use_type text, age integer,
  condition text, view_text text,
  features text[] not null default '{}',
  description_ar text, description_en text,
  -- sale
  price integer, payment text check (payment in ('cash', 'installments', 'both')),
  -- rent
  rent integer, furnishing text, deposit integer, available text,
  -- payment plan: null = cash only, 'project' = inherit from project, 'custom' = values below
  plan_source text check (plan_source in ('project', 'custom')),
  plan_down integer check (plan_down between 0 and 100),
  plan_months integer check (plan_months >= 0),
  plan_handover integer check (plan_handover between 0 and 100),
  plan_handover_date text,
  plan_note text,
  video_url text,
  -- stats
  views integer not null default 0,
  leads integer not null default 0,
  listed_at date not null default current_date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.listings (status, deal);
create index on public.listings (area_id);
create index on public.listings (project_id);
create index on public.listings (agent_id);

create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references public.listings(id) on delete cascade on update cascade,
  kind text not null default 'photo' check (kind in ('photo', 'plan')),
  url text not null,
  name text,
  storage_path text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.listing_media (listing_id, kind, sort);

-- Internal owner info: never exposed to the public site.
create table public.listing_private (
  listing_id text primary key references public.listings(id) on delete cascade on update cascade,
  owner_name text,
  owner_phone text,
  updated_at timestamptz not null default now()
);

create table public.listing_events (
  id bigint generated always as identity primary key,
  listing_id text not null references public.listings(id) on delete cascade on update cascade,
  kind text not null,
  label text not null,
  actor_name text,
  created_at timestamptz not null default now()
);
create index on public.listing_events (listing_id, created_at desc);

-- ───────────────────────────── site settings (single row)
create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  show_agent boolean not null default true,
  show_listing_id boolean not null default true,
  hero_kicker text not null default 'عقارات أربيل، كلها',
  hero_title text not null default 'اشتري، استأجر، *وافهم قبل لا تقرر.*',
  announcement text,
  sections jsonb not null default '{"types":true,"featured":true,"areas":true,"tools":true,"owners":true}',
  home_areas text[] not null default '{}',
  featured_project_id text references public.projects(id) on delete set null on update cascade,
  office_phone text not null default '+964 66 000 0000',
  office_whatsapp text not null default '+964 750 000 0000',
  office_address text not null default 'كولان، شارع الستين، مجمع المكاتب، الطابق 3',
  iqd_rate integer not null default 1310,
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── CRM
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  source text not null default 'الموقع',
  stage public.contact_stage not null default 'new',
  score public.contact_score not null default 'warm',
  deal public.deal_type,
  agent_id text references public.agents(id) on delete set null on update cascade,
  budget integer,
  note text,
  last_activity_at timestamptz not null default now(),
  first_response_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.contacts (stage);
create index on public.contacts (agent_id);
create index on public.contacts (created_at desc);

create table public.contact_listings (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  listing_id text not null references public.listings(id) on delete cascade on update cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, listing_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  kind text not null check (kind in ('note', 'call', 'task', 'web', 'system')),
  body text not null default '',
  due_at timestamptz,
  done boolean not null default false,
  agent_id text references public.agents(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.activities (contact_id, created_at desc);

create table public.viewings (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  listing_id text references public.listings(id) on delete set null on update cascade,
  agent_id text references public.agents(id) on delete set null on update cascade,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('confirmed', 'pending', 'second', 'done', 'cancelled')),
  note text,
  created_at timestamptz not null default now()
);
create index on public.viewings (scheduled_at);
