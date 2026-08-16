-- Torres em Comum — schema inicial Supabase/PostgreSQL
create extension if not exists pgcrypto;

create type public.resident_role as enum ('owner','tenant');
create type public.response_choice as enum ('agree','change','exclude','observe','abstain');

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 3),
  tower char(1) not null check (tower in ('A','B','C','D')),
  apartment char(3) not null check (apartment ~ '^[0-9]{3}$'),
  role public.resident_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tower, apartment)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  device_id text not null,
  choice public.response_choice not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, device_id),
  check (choice in ('agree','abstain') or nullif(trim(comment),'') is not null)
);

create index responses_device_idx on public.responses(device_id);
create index responses_choice_idx on public.responses(choice);

-- O cliente público nunca precisa ler nomes/unidades para montar o painel.
create view public.aggregate_responses as
select device_id, choice, count(*)::int as total
from public.responses
group by device_id, choice;

create view public.participation_summary as
select count(*)::int as participating_units,
       count(*) filter (where role='owner')::int as owners,
       count(*) filter (where role='tenant')::int as tenants
from public.participants;

alter table public.participants enable row level security;
alter table public.responses enable row level security;

-- As políticas de INSERT/UPDATE serão ativadas quando o método de autenticação
-- estiver definido. Não publicar chave service_role no frontend.
comment on view public.aggregate_responses is 'Resultados agregados por dispositivo e escolha; sem identificação pública de unidade ou morador.';
