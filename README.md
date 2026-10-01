# Számlafeldolgozó (MVP)

Vállalkozó + könyvelő + NAV egy helyen: számlák lekérdezése a NAV Online Számlából,
papírszámlák és fényképek AI-kiolvasása, export bármelyik könyvelőprogramhoz.

Stack: Next.js · Supabase · Vercel · GitHub (később: RunPod).

## Telepítés lépésről lépésre

### 1. Supabase
1. supabase.com → New project (válassz EU régiót).
2. SQL Editor → New query → másold be a `supabase/all-in-one.sql` teljes tartalmát → Run.
   (Külön is futtathatók sorrendben: `01_schema.sql`, `02_export.sql`, `03_nav.sql`, `04_access.sql`.)
3. Project Settings → API: jegyezd fel a **Project URL**, az **anon public** és a **service_role** kulcsot.
4. Authentication → Providers → Email: fejlesztés alatt a "Confirm email" kikapcsolható, **éles használatnál viszont kötelezően legyen bekapcsolva** (lásd lent, Hozzáférés).

### 2. Titkosítási kulcs
Generálj egy 32 bájtos kulcsot (a NAV-adatok titkosításához):
`openssl rand -base64 32`
Mentsd el biztonságos helyre: ha elveszik, a NAV-adatokat újra meg kell adni.

### 3. GitHub
Töltsd fel a projekt tartalmát ide (a `.env.local` fájl soha ne kerüljön fel, a `.gitignore` ezt már kizárja).

### 4. Vercel
1. vercel.com → Add New → Project → válaszd ki a GitHub-repót.
2. Environment Variables (lásd lent), majd Deploy.
3. Supabase → Authentication → URL Configuration: a **Site URL** legyen a Vercel-címed.

### 5. Első használat
Regisztráció → cég felvétele → NAV-kapcsolat (kezdetben **Teszt** környezet) → "Számlák lekérdezése a NAV-ból"
→ exportprofil létrehozása → letöltés. Papírszámla/fotó: a "Feltöltés" résznél.

## Környezeti változók

| Változó | Honnan | Titkos? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | nem |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | nem |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **igen** |
| `CREDENTIALS_ENCRYPTION_KEY` | 2. lépés | **igen** |
| `ANTHROPIC_API_KEY` | AI-kiolvasáshoz (console.anthropic.com) | **igen** |
| `ANTHROPIC_MODEL` | opcionális | nem |
| `NAV_SOFTWARE_ID` | pontosan 18 karakter (0-9, A-Z, kötőjel) | nem |
| `NAV_DEV_NAME`, `NAV_DEV_CONTACT` | a fejlesztő neve és e-mail-címe (a NAV kéri) | nem |

A titkos változóknak soha nem szabad `NEXT_PUBLIC_` előtagot adni, és nem kerülhetnek a GitHubra.

## Helyi futtatás
```
cp .env.example .env.local   # töltsd ki
npm install
npm run dev                  # http://localhost:3000
```

## Hozzáférés (könyvelő meghívása)
A cég tulajdonosa a cég oldalán, a "Hozzáférés" résznél meghívhat egy könyvelőt az e-mail-címével.
A meghívás akkor lép életbe, amikor a könyvelő ugyanezzel a címmel regisztrál vagy bejelentkezik:
a cég automatikusan megjelenik nála. A meghívó csak **megerősített e-mail-címmel** váltható be,
ezért éles környezetben a Supabase "Confirm email" beállítása legyen bekapcsolva.

## NAV élesítés előtti ellenőrzőlista
- Teszt környezetben először végezz sikeres `queryInvoiceDigest` lekérdezést.
- A NAV technikai felhasználóhoz tartozó jelszó, aláírókulcs és adószám csak a NAV-beállítási űrlapon kerüljön megadásra; chatbe vagy GitHubra ne másold.
- Sikeres digest után egy kiválasztott számla teljes XML-adatát külön `queryInvoiceData` hívással kell lekérni, ha könyvelési tételsorokra van szükség.
- Éles használat előtt kapcsold be a Supabase e-mail-megerősítést.

## Biztonsági megjegyzések
- A `nav_credentials` táblán szándékosan nincs RLS policy: a kliens egyáltalán nem éri el.
- A titkosított oszlopok (`login_enc`, `password_enc`, `signature_key_enc`, `exchange_key_enc`, `tax_number_enc`)
kizárólag szerveroldalon, a `SUPABASE_SERVICE_ROLE_KEY`-jel olvashatók.
- A beküldési ág (számla feladása a NAV-hoz) a cserekulcsot és az aláírókulcsot igényli; ha hiányoznak,
a szerveroldali kód explicit hibát ad, nem a NAV homályos válaszát.
