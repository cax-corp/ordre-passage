begin;

create table if not exists public.admin_settings (
  id integer primary key default 1,
  admin_password text not null,
  constraint admin_settings_singleton check (id = 1)
);

insert into public.admin_settings (id, admin_password)
values (1, 'ensi')
on conflict (id) do update set admin_password = excluded.admin_password;

create table if not exists public.schedule_entries (
  id bigint generated always as identity primary key,
  display_order integer not null unique,
  time_label text not null,
  group_label text not null,
  is_break boolean not null default false,
  status text not null default 'neutral',
  in_progress_started_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint schedule_entries_status_check
    check (status in ('neutral', 'preparing', 'in_progress', 'done', 'cancelled'))
);

alter table public.schedule_entries
  add column if not exists in_progress_started_at timestamptz;

alter table public.schedule_entries
  add column if not exists cancelled_at timestamptz;

alter table public.schedule_entries
  drop constraint if exists schedule_entries_status_check;

alter table public.schedule_entries
  add constraint schedule_entries_status_check
  check (status in ('neutral', 'preparing', 'in_progress', 'done', 'cancelled'));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_updated_at on public.schedule_entries;
create trigger trg_touch_updated_at
before update on public.schedule_entries
for each row
execute function public.touch_updated_at();

truncate table public.schedule_entries restart identity;

insert into public.schedule_entries (display_order, time_label, group_label, is_break, status)
values
  (1,  '9h30',  '-', false, 'neutral'),
  (2,  '9h45',  'VIAL CECILE - POUNT ERICA', false, 'neutral'),
  (3,  '10h',   'PALISSE CLARA - MARTINEZ AURELIE', false, 'neutral'),
  (4,  '10h15', 'JOUBERT JULIETTE - NAHON EVY', false, 'neutral'),
  (5,  '10h30', 'PASSE ENOLA - RUBY AXEL', false, 'neutral'),
  (6,  '10h45', 'LINA - SASHA', false, 'neutral'),
  (7,  '11h',   'PAUSE', true, 'neutral'),
  (8,  '11h15', 'COME - LYNA', false, 'neutral'),
  (9,  '11h30', 'WAGNER YANN - WARNIER JULIE', false, 'neutral'),
  (10, '11h45', 'SIMONIN HELENE - YUNG AURORE', false, 'neutral'),
  (11, '12h',   'MAKAR - LILOU', false, 'neutral'),
  (12, '12h15', 'NOEMIE - VINCENT', false, 'neutral'),
  (13, '12h30', 'SIMON - DORIAN - TIMEO (puis pause)', false, 'neutral'),
  (14, '14h',   'JULIETTE LEFEL - GUILLAUME', false, 'neutral'),
  (15, '14h15', 'ALVIN EWAN - CARILLUCAS', false, 'neutral'),
  (16, '14h30', 'BARBERA LOLA - BROGNARD MAY', false, 'neutral'),
  (17, '14h45', 'ARISTOTE JULIE - DRISKILL LOUIS', false, 'neutral'),
  (18, '15h',   'BARBATE LUCAS - CALAME LUICAS - GALO ELIE JUNE', false, 'neutral'),
  (19, '15h15', 'BARIAL THOMAS - BONNEAUD LEONIE - CHARLES ALFRED CHERRYTON', false, 'neutral'),
  (20, '15h30', 'BELARDI ELEA - CRUZ ANGELE', false, 'neutral'),
  (21, '15h45', 'BERNARD BENJAMIN', false, 'neutral'),
  (22, '16h',   'CASSAGNE EMILIE - CHANARD LOUIS', false, 'neutral'),
  (23, '16h15', 'EL ASKI RANIA - GARULLI MARTIN', false, 'neutral'),
  (24, '16h30', 'FAURE ESTEBAN - BRUCHET LISA - DECUREY SIRIWUN', false, 'neutral'),
  (25, '16h45', 'GONZALES ESTEBAN - AU LENA', false, 'neutral'),
  (26, '17h',   'FIN DE JOURNEE', true, 'neutral');

alter table public.schedule_entries enable row level security;

revoke all on public.schedule_entries from anon;
revoke all on public.schedule_entries from authenticated;

grant select on public.schedule_entries to anon, authenticated;

drop policy if exists "public read schedule entries" on public.schedule_entries;
create policy "public read schedule entries"
on public.schedule_entries
for select
to anon, authenticated
using (true);

create or replace function public.verify_admin_password(input_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  select admin_password = input_password into ok
  from public.admin_settings
  where id = 1;

  return coalesce(ok, false);
end;
$$;

create or replace function public.set_entry_status(
  p_entry_id bigint,
  p_new_status text,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.schedule_entries%rowtype;
  v_updated boolean := false;
begin
  if p_new_status not in ('neutral', 'preparing', 'in_progress', 'done', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  if not public.verify_admin_password(p_password) then
    return false;
  end if;

  select *
  into v_entry
  from public.schedule_entries
  where id = p_entry_id
    and is_break = false
  for update;

  if not found then
    return false;
  end if;

  if p_new_status = 'in_progress' then
    update public.schedule_entries
    set status = 'in_progress',
        in_progress_started_at = now(),
        cancelled_at = null
    where id = p_entry_id;
    v_updated := found;
  elsif p_new_status = 'cancelled' then
    if v_entry.status = 'in_progress' then
      update public.schedule_entries
      set cancelled_at = now()
      where id = p_entry_id;
      v_updated := found;
    else
      update public.schedule_entries
      set status = 'cancelled',
          cancelled_at = now(),
          in_progress_started_at = null
      where id = p_entry_id;
      v_updated := found;

      update public.schedule_entries
      set status = 'neutral',
          cancelled_at = null,
          in_progress_started_at = null
      where id = (
        select id
        from public.schedule_entries
        where display_order > v_entry.display_order
          and not is_break
          and status <> 'cancelled'
        order by display_order
        limit 1
      );
    end if;
  else
    update public.schedule_entries
    set status = p_new_status,
        cancelled_at = null,
        in_progress_started_at = null
    where id = p_entry_id;
    v_updated := found;
  end if;

  return v_updated;
end;
$$;

create or replace function public.advance_entry_after_timer(
  p_entry_id bigint,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.schedule_entries%rowtype;
begin
  if not public.verify_admin_password(p_password) then
    return false;
  end if;

  select *
  into v_entry
  from public.schedule_entries
  where id = p_entry_id
    and is_break = false
  for update;

  if not found or v_entry.status <> 'in_progress' then
    return false;
  end if;

  update public.schedule_entries
  set status = case when v_entry.cancelled_at is not null then 'cancelled' else 'done' end,
      cancelled_at = v_entry.cancelled_at,
      in_progress_started_at = null
  where id = p_entry_id;

  update public.schedule_entries
  set status = 'neutral',
      cancelled_at = null,
      in_progress_started_at = null
  where id = (
    select id
    from public.schedule_entries
    where display_order > v_entry.display_order
      and not is_break
      and status <> 'cancelled'
    order by display_order
    limit 1
  );

  return true;
end;
$$;

grant execute on function public.verify_admin_password(text) to anon, authenticated;
grant execute on function public.set_entry_status(bigint, text, text) to anon, authenticated;
grant execute on function public.advance_entry_after_timer(bigint, text) to anon, authenticated;

alter table public.schedule_entries replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'schedule_entries'
  ) then
    execute 'alter publication supabase_realtime add table public.schedule_entries';
  end if;
end;
$$;

commit;
