-- Hozzáférés-kezelés: könyvelő meghívása a cégbe
-- Futtatás a 01-03 UTÁN.

create function public.is_owner(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = cid and user_id = auth.uid() and role = 'owner'
  );
$$;

create function public.shares_company_with(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members a
    join public.company_members b on a.company_id = b.company_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;

create policy "profiles of co-members" on public.profiles
  for select using (public.shares_company_with(id));

create table public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null check (email = lower(email)),
  role text not null default 'accountant' check (role in ('accountant')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, email)
);

alter table public.company_invites enable row level security;

create policy "invites read" on public.company_invites
  for select using (public.is_member(company_id));
create policy "invites insert" on public.company_invites
  for insert with check (public.is_owner(company_id) and invited_by = auth.uid());
create policy "invites delete" on public.company_invites
  for delete using (public.is_owner(company_id));

create policy "owner removes accountants" on public.company_members
  for delete using (public.is_owner(company_id) and role = 'accountant');

-- ===== Meghívó beváltása =====
-- Ez a lépés eddig hiányzott: a könyvelő sehogy nem került be a company_members-be.
-- A függvény a MEGERŐSÍTETT e-mail-címet ellenőrzi, ahogy a README előírja.

create or replace function public.accept_company_invite()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_confirmed timestamptz;
  v_invite public.company_invites%rowtype;
  v_count integer := 0;
begin
  select email, email_confirmed_at
    into v_email, v_confirmed
    from auth.users
   where id = auth.uid();

  if v_email is null then
    raise exception 'Nincs bejelentkezett felhasználó.';
  end if;

  if v_confirmed is null then
    raise exception 'A meghívó beváltásához meg kell erősíteni az e-mail-címet.';
  end if;

  for v_invite in
    select * from public.company_invites where email = lower(v_email)
  loop
    insert into public.company_members (company_id, user_id, role)
    values (v_invite.company_id, auth.uid(), v_invite.role)
    on conflict (company_id, user_id) do nothing;

    delete from public.company_invites where id = v_invite.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.accept_company_invite() from public;
grant execute on function public.accept_company_invite() to authenticated;
