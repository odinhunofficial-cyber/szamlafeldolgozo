-- NAV-modul: környezet, adószám és utolsó lekérdezés a hitelesítő adatokhoz
-- Futtatás a 01-02 UTÁN.

alter table public.nav_credentials
  add column if not exists environment text not null default 'test'
    check (environment in ('test', 'prod')),
  add column if not exists tax_number_enc text,
  add column if not exists last_synced_at timestamptz;

-- A cserekulcsra és az aláírókulcsra csak számlabeküldéshez lenne szükség.
-- A beküldési ág elején a szerveroldali kód explicit hibát ad, ha hiányzik.
alter table public.nav_credentials alter column exchange_key_enc drop not null;
alter table public.nav_credentials alter column signature_key_enc drop not null;
