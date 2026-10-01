-- Export-kompatibilitás: konfigurálható exportprofilok
-- Futtatás a schema.sql UTÁN

create table public.export_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  format text not null default 'csv' check (format in ('csv', 'xlsx')),
  delimiter text not null default ';',
  decimal_separator text not null default ',',
  date_format text not null default 'YYYY-MM-DD',
  encoding text not null default 'utf-8'
    check (encoding in ('utf-8', 'windows-1250', 'iso-8859-2')),
  -- [{"header": "Számlaszám", "field": "invoice_number"}, ...]
  column_mapping jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(column_mapping) = 'array'
      and not exists (
        select 1 from jsonb_array_elements(column_mapping) e
        where not (e ? 'header') or not (e ? 'field')
      )
    ),
  created_at timestamptz not null default now()
);

alter table public.export_profiles enable row level security;

create policy "export profiles read" on public.export_profiles
  for select using (public.is_member(company_id));
create policy "export profiles insert" on public.export_profiles
  for insert with check (public.is_owner(company_id));
create policy "export profiles update" on public.export_profiles
  for update using (public.is_owner(company_id));
create policy "export profiles delete" on public.export_profiles
  for delete using (public.is_owner(company_id));
