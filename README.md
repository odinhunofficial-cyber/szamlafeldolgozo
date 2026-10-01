# Számlafeldolgozó (MVP)

Vállalkozó + könyvelő + NAV egy helyen: számlák lekérdezése a NAV Online Számlából,
papírszámlák és fényképek AI-kiolvasása, export bármelyik könyvelőprogramhoz.

Stack: Next.js · Supabase · Vercel · GitHub (később: RunPod).

## Telepítés

### 1. Supabase
1. supabase.com → New project (EU régió).
2. SQL Editor → a `supabase/` mappa fájljait **ebben a sorrendben**:
   `01_schema.sql` → `02_export.sql` → `03_nav.sql` → `04_access.sql`.
   (A sorrend kötelező: a `02` az `is_owner()`-t használja, amit a `04` hoz létre.)
3. Project Settings → API: **Project URL**, **anon public**, **service_role**.
4. Authentication → Providers → Email: éles használatnál a "Confirm email" legyen bekapcsolva.

### 2. Titkosítási kulcs
`openssl rand -base64 32`
Ha elveszik, a NAV-adatokat újra meg kell adni.

### 3. Vercel
Environment Variables, majd Deploy.
Supabase → Authentication → URL Configuration: a **Site URL** a Vercel-címed.

## Környezeti változók

| Változó | Titkos? |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | nem |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | nem |
| `SUPABASE_SERVICE_ROLE_KEY` | **igen** |
| `CREDENTIALS_ENCRYPTION_KEY` | **igen** |
| `ANTHROPIC_API_KEY` | **igen** |
| `ANTHROPIC_MODEL` | nem |
| `NAV_SOFTWARE_ID` | nem |
| `NAV_DEV_NAME`, `NAV_DEV_CONTACT` | nem |

## Helyi futtatás
```
cp .env.example .env.local
npm install
npm run dev
```

## Hozzáférés (könyvelő meghívása)
A cég tulajdonosa a cég oldalán meghívhat egy könyvelőt e-mail-címmel.
A meghívás a könyvelő bejelentkezésekor lép életbe, és csak megerősített e-mail-címmel váltható be.

## NAV élesítés előtti ellenőrzőlista
- Teszt környezetben először sikeres `queryInvoiceDigest` lekérdezés.
- A NAV jelszó, aláírókulcs és adószám csak a beállítási űrlapon legyen megadva.
- Éles használat előtt kapcsold be a Supabase e-mail-megerősítést.
