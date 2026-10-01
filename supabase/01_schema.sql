-- Számlafeldolgozó MVP: alapséma (Supabase / Postgres)
-- Futtatás: Supabase Dashboard -> SQL Editor -> New query -> beillesztés -> Run

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_number text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Ki fér hozzá melyik céghez: vállalkozó (owner) vagy könyvelő (accountant)
create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'accountant')),
  primary key (company_id, user_id)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source text not null check (source in ('nav', 'upload')),
  direction text not null check (direction in ('outgoing', 'incoming')),
  invoice_number text,
  issue_date date,
  supplier_name text,
  supplier_tax_number text,
  customer_name text,
  customer_tax_number text,
  net_amount numeric(14, 2),
  vat_amount numeric(14, 2),
  gross_amount numeric(14, 2),
  currency text not null default 'HUF',
  category text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'exported')),
  file_path text,
  raw jsonb,
  raw_xml text,
  created_at timestamptz not null default now()
);

-- A hiányzó számlaszám is egység: coalesce-szal, mert a sima unique constraint
-- két null-t nem tekint egyenlőnek, így a feltöltött számlák duplikálódnának.
create unique index invoices_unique_number_idx
  on public.invoices (company_id, direction, coalesce(invoice_number, ''));

create index invoices_company_date_idx on public.invoices (company_id, issue_date desc);

-- NAV technikai felhasználó adatai: titkosítva, CSAK szerveroldalról (service role) érhető el
create table public.nav_credentials (
  company_id uuid primary key references public.companies(id) on delete cascade,
  login_enc text not null,
  password_enc text not null,
  signature_key_enc text,
  exchange_key_enc text,
  tax_number_enc text,
  environment text not null default 'test' check (environment in ('test', 'prod')),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ========== Automatikus profil regisztrációkor ==========

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== Jogosultságok (Row Level Security) ==========

create function public.is_member(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = cid and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.invoices enable row level security;
alter table public.nav_credentials enable row level security;
-- nav_credentials: szándékosan nincs policy, így a kliens nem fér hozzá

create policy "own profile read" on public.profiles
  for select using (id = auth.uid());
create policy "own profile update" on public.profiles
  for update using (id = auth.uid());

create policy "companies read" on public.companies
  for select using (public.is_member(id) or created_by = auth.uid());
create policy "companies insert" on public.companies
  for insert with check (created_by = auth.uid());

create policy "members read" on public.company_members
  for select using (user_id = auth.uid() or public.is_member(company_id));
create policy "creator adds self as owner" on public.company_members
  for insert with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.companies c
      where c.id = company_id and c.created_by = auth.uid()
    )
  );

create policy "invoices read" on public.invoices
  for select using (public.is_member(company_id));
create policy "invoices insert" on public.invoices
  for insert with check (public.is_member(company_id));
create policy "invoices update" on public.invoices
  for update using (public.is_member(company_id));

-- ========== Fájltárolás (feltöltött számlák) ==========
-- Útvonal-konvenció: <company_id>/<fájlnév>

insert into storage.buckets (id, name, public)
values ('invoice-files', 'invoice-files', false)
on conflict (id) do nothing;

create policy "members read invoice files" on storage.objects
  for select using (
    bucket_id = 'invoice-files'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy "members upload invoice files" on storage.objects
  for insert with check (
    bucket_id = 'invoice-files'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
