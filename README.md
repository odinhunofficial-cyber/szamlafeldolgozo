# Aurum — Számlafeldolgozó (MVP)

Vállalkozó, könyvelő és a NAV Online Számla egy helyen.

Stack: Next.js · Supabase · Vercel · GitHub (később: RunPod).

## Telepítés

### 1. Supabase
1. supabase.com → New project (EU régió).
2. SQL Editor → a `supabase/` mappa fájljait **ebben a sorrendben**:
   `01_schema.sql` → `02_export.sql` → `03_nav.sql` → `04_access.sql`.
   (A sorrend kötelező: a `02` az `is_owner()`-t használja, amit a `04` hoz létre.)
3. Project Settings → API: **Project URL**, **anon public**, **service_role**.

### 2. Titkosítási kulcs
`openssl rand -base64 32`
Ha elveszik, a NAV-adatokat újra meg kell adni.

### 3. Vercel
Environment Variables, majd Deploy.
Supabase → Authentication → URL Configuration: a **Site URL** a Vercel-címed.

## Környezeti változók

| Változó | Titkos? | Megjegyzés |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | nem | Config |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | nem | Config |
| `SUPABASE_ADMIN_KEY` | **igen** | Secret — a Vercel nem engedi `SERVICE_ROLE` néven |
| `CREDENTIALS_ENCRYPTION_KEY` | **igen** | Secret |
| `ANTHROPIC_API_KEY` | **igen** | Secret |
| `ANTHROPIC_MODEL` | nem | Config |
| `NAV_SOFTWARE_ID` | nem | Config, 18 karakter |
| `NAV_DEV_NAME`, `NAV_DEV_CONTACT` | nem | Config |

## Helyi futtatás
```
cp .env.example .env.local
npm install
npm run dev
```

## Hozzáférés (könyvelő meghívása)
A cég tulajdonosa a cég oldalán hívhat meg könyvelőt e-mail-címmel.
A meghívás a könyvelő bejelentkezésekor lép életbe, és csak megerősített e-mail-címmel váltható be.

## NAV élesítés előtti ellenőrzőlista
- Teszt környezetben először sikeres `queryInvoiceDigest` lekérdezés.
- A NAV jelszó, aláírókulcs és adószám csak a beállítási űrlapon legyen megadva.
- Éles használat előtt kapcsold be a Supabase e-mail-megerősítést.
