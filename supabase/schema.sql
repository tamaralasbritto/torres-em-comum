-- Torres em Comum — schema de referência
-- Privacidade por desenho: nenhuma tabela individual é exposta ao Data API.
-- O navegador conversa apenas com a Edge Function `participation`.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create type public.resident_role as enum ('owner','tenant');
create type public.response_choice as enum ('agree','change','exclude','observe','abstain');
create type public.participation_status as enum ('draft','finalized','superseded','withdrawn');

create table private.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 160),
  tower char(1) not null check (tower in ('A','B','C','D')),
  apartment char(3) not null check (
    apartment ~ '^[0-9]{3}$'
    and substring(apartment,1,1)::int between 0 and 9
    and substring(apartment,2,2)::int between 1 and 10
  ),
  role public.resident_role not null,
  status public.participation_status not null default 'draft',
  resume_token_hash text not null check (resume_token_hash ~ '^[0-9a-f]{64}$'),
  protocol_id uuid not null default gen_random_uuid() unique,
  payload_hash text check (payload_hash is null or payload_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  finalized_at timestamptz,
  superseded_at timestamptz,
  superseded_by uuid references private.participants(id)
);

create unique index one_active_finalized_participation_per_unit
  on private.participants(tower,apartment) where status='finalized';
create index participants_superseded_by_idx on private.participants(superseded_by);

create table private.responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references private.participants(id) on delete cascade,
  device_id text not null check (device_id ~ '^art-[a-z0-9-]+$'),
  choice public.response_choice not null,
  comment text check (comment is null or char_length(comment) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(participant_id,device_id)
);
create index responses_device_idx on private.responses(device_id);
create index responses_choice_idx on private.responses(choice);

create table private.audit_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references private.participants(id) on delete restrict,
  protocol_id uuid not null,
  event_type text not null check (event_type in ('draft_created','draft_saved','finalized','superseded','withdrawn')),
  payload_hash text check (payload_hash is null or payload_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index audit_events_participant_idx on private.audit_events(participant_id,occurred_at);
create index audit_events_protocol_idx on private.audit_events(protocol_id,occurred_at);

alter table private.participants enable row level security;
alter table private.responses enable row level security;
alter table private.audit_events enable row level security;

-- Nenhuma policy: anon/authenticated ficam em deny-by-default.
revoke all on schema private from public,anon,authenticated;
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on all sequences in schema private from public,anon,authenticated;

-- Evita exposição acidental de objetos futuros.
alter default privileges for role postgres in schema public
  revoke select,insert,update,delete on tables from anon,authenticated,service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon,authenticated,service_role;
alter default privileges for role postgres in schema public
  revoke usage,select on sequences from anon,authenticated,service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema private
  revoke select,insert,update,delete on tables from public,anon,authenticated,service_role;
alter default privileges for role postgres in schema private
  revoke execute on functions from public,anon,authenticated,service_role;
alter default privileges for role postgres in schema private
  revoke usage,select on sequences from public,anon,authenticated,service_role;

create function private.prevent_audit_mutation() returns trigger
language plpgsql security invoker set search_path=''
as $$ begin raise exception 'audit_events is append-only'; end $$;
create trigger audit_events_no_update before update or delete on private.audit_events
for each row execute function private.prevent_audit_mutation();

create function private.canonical_manifestation(p_participant_id uuid) returns text
language sql stable security invoker set search_path=''
as $$
  select jsonb_build_object(
    'protocol_id',p.protocol_id,'name',p.name,'tower',p.tower,'apartment',p.apartment,'role',p.role,
    'responses',coalesce((select jsonb_agg(jsonb_build_object(
      'device_id',r.device_id,'choice',r.choice,'comment',nullif(btrim(r.comment),'')
    ) order by r.device_id) from private.responses r where r.participant_id=p.id),'[]'::jsonb)
  )::text
  from private.participants p where p.id=p_participant_id;
$$;

create function private.hash_manifestation(p_participant_id uuid) returns text
language sql stable security invoker set search_path=''
as $$ select encode(extensions.digest(convert_to(private.canonical_manifestation(p_participant_id),'UTF8'),'sha256'::text),'hex') $$;

create function private.save_draft(p_participant_id uuid,p_resume_token_hash text,p_responses jsonb)
returns timestamptz language plpgsql security invoker set search_path=''
as $$
declare v private.participants%rowtype; item jsonb; v_choice public.response_choice; v_comment text; v_saved timestamptz:=clock_timestamp();
begin
  if jsonb_typeof(p_responses)<>'array' or jsonb_array_length(p_responses)>800 then raise exception 'invalid_responses'; end if;
  select p.* into v from private.participants p where p.id=p_participant_id for update;
  if not found then raise exception 'participation_not_found'; end if;
  if v.resume_token_hash<>p_resume_token_hash then raise exception 'invalid_resume_token'; end if;
  if v.status<>'draft' then raise exception 'draft_not_editable'; end if;
  delete from private.responses where participant_id=v.id;
  for item in select value from jsonb_array_elements(p_responses) loop
    if coalesce(item->>'device_id','')!~'^art-[a-z0-9-]+$' then raise exception 'invalid_device_id'; end if;
    begin v_choice:=(item->>'choice')::public.response_choice; exception when others then raise exception 'invalid_choice'; end;
    v_comment:=nullif(btrim(item->>'comment'),'');
    if v_comment is not null and char_length(v_comment)>5000 then raise exception 'comment_too_long'; end if;
    insert into private.responses(participant_id,device_id,choice,comment) values(v.id,item->>'device_id',v_choice,v_comment);
  end loop;
  update private.participants set last_saved_at=v_saved,updated_at=v_saved where id=v.id;
  insert into private.audit_events(participant_id,protocol_id,event_type,metadata)
    values(v.id,v.protocol_id,'draft_saved',jsonb_build_object('response_count',jsonb_array_length(p_responses)));
  return v_saved;
end $$;

create function private.finalize_participation(p_participant_id uuid,p_resume_token_hash text)
returns table(protocol_id uuid,status public.participation_status,finalized_at timestamptz,payload_hash text)
language plpgsql security invoker set search_path=''
as $$
declare v private.participants%rowtype; current_final private.participants%rowtype; v_hash text; v_now timestamptz:=clock_timestamp();
begin
  select p.* into v from private.participants p where p.id=p_participant_id for update;
  if not found then raise exception 'participation_not_found'; end if;
  if v.resume_token_hash<>p_resume_token_hash then raise exception 'invalid_resume_token'; end if;
  if v.status<>'draft' then raise exception 'participation_not_draft'; end if;
  perform pg_advisory_xact_lock(hashtext(v.tower::text||':'||v.apartment));
  select p.* into current_final from private.participants p
   where p.tower=v.tower and p.apartment=v.apartment and p.status='finalized' and p.id<>v.id
   order by p.finalized_at desc nulls last limit 1 for update;
  if found then
    if v.role='tenant' and current_final.role='owner' then raise exception 'owner_already_finalized'; end if;
    update private.participants set status='superseded',superseded_at=v_now,superseded_by=v.id,updated_at=v_now where id=current_final.id;
    insert into private.audit_events(participant_id,protocol_id,event_type,payload_hash,metadata)
      values(current_final.id,current_final.protocol_id,'superseded',current_final.payload_hash,jsonb_build_object('superseded_by_protocol',v.protocol_id));
  end if;
  if not exists(select 1 from private.responses r where r.participant_id=v.id) then raise exception 'empty_manifestation'; end if;
  v_hash:=private.hash_manifestation(v.id);
  update private.participants set status='finalized',payload_hash=v_hash,finalized_at=v_now,updated_at=v_now,last_saved_at=v_now where id=v.id;
  insert into private.audit_events(participant_id,protocol_id,event_type,payload_hash) values(v.id,v.protocol_id,'finalized',v_hash);
  return query select p.protocol_id,p.status,p.finalized_at,p.payload_hash from private.participants p where p.id=v.id;
end $$;

revoke all on all functions in schema private from public,anon,authenticated,service_role;
comment on schema private is 'PII, individual responses and audit trail; never exposed through the Data API.';
