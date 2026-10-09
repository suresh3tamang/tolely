# Tolely architecture

How the project is organised, the rules that keep it tidy as features are added,
and step-by-step recipes for the common changes.

```
Phone app (Flutter) ──HTTPS──▶ Backend (Next.js API) ──▶ Firebase (Firestore, Auth, Messaging)
        │                                                        ▲
        └────────── live reads, protected by firestore.rules ────┘
Admin console + website (Next.js pages) ──▶ the same Backend
```

- **Reads** that need to be live (a booking's status, the supplier on the map) go from the app
  straight to Firestore. `firestore.rules` lets people read only what belongs to them.
- **Every change** goes through the backend API. It checks who is calling, applies the business
  rules, and decides prices. The app can never write to the database directly.

---

## Who uses what

| | Website (`/book`) | Mobile app |
|---|---|---|
| **Customers** | Sign in with **Google**, verify a phone number once, book and follow bookings | Sign in with **phone number**, same features, plus push notifications and the map |
| **Service providers** | Not available: they are sent to the app | **Only here**, signed in with their phone number |
| **Admins** | `/admin` (email + password) | not available |

How it is enforced (on the server, so it can't be bypassed from the website):
- Every login carries how the person signed in (`phone`, `google.com`, `password`). A supplier account
  is accepted **only with a phone login** (`assertSupplierChannel` in `server/http/auth.ts`, applied by
  `requireRole`), and signing up as a supplier needs one too.
- A booking needs a verified phone number (the supplier calls the customer). Website customers verify
  theirs once; the number is **linked to their Google account**, so the same person signing in to the app
  with that number is the same account and sees the same bookings.
- A phone number can belong to one account. If it already has one (for example made in the app), linking
  is refused and the page explains it.

The customer pages are in `web/src/app/book` (one component per step: sign in → verify phone →
profile → book / my bookings), with Nepali and English texts in `web/src/client/i18n/strings.ts`.
The bookings list reads the customer's own bookings straight from Firestore (live), like the app.

The **map comes first** in the booking form (`location-picker.tsx`, Leaflet with OpenStreetMap tiles): it
asks the browser for the current location, zooms to street level and drops a pin; the customer can drag
the pin or tap another place. A pin inside Nepal is required on the website and is sent with the booking, so
the supplier gets directions. The browser only gives its location on HTTPS or `localhost`; otherwise the
customer is told and taps the map instead.

The rest of the form is numbered steps: **where** (map) → **what** (service and size) → **when** (day chips
for today / tomorrow / another date, then a time window such as 12 PM – 3 PM, or "as soon as possible" today;
rules in `schedule.ts`) → **who to contact** (name and phone, prefilled from the account but changeable, e.g.
for a family member who will be home) → payment and notes. A booking stores `scheduledFor` (window start),
`scheduledEnd`, `contactName` and `contactPhone`; suppliers in the app see the window and call the contact
number. Older bookings without these fields still work.

A **place search box** sits above the map (`place-search.tsx`): typing "Balkot Chowk" and pressing Search
moves the map there and drops the pin, then the customer drags it the last ~100 m to their house. It calls
`GET /api/places/search` (`server/places/`), which asks OpenStreetMap's Nominatim from the server (it needs a
real User-Agent, max 1 request/second, no search-as-you-type), caches answers 10 minutes, and limits each
signed-in person to 20 searches a minute. Switch to a paid geocoder before heavy traffic; only
`places.service.ts` changes. Set `PLACES_USER_AGENT` in production with a contact address.

---

## Repository layout

| Folder | What it is |
|---|---|
| `mobile/` | Flutter app (Android + iOS) for customers and suppliers |
| `web/` | Next.js: public website, admin console (`/admin`), and the backend API (`/api/*`) |
| `brand/` | Logo and app icon sources |
| `docs/` | This guide |
| `firestore.rules`, `firestore.indexes.json`, `firebase.json` | Firebase configuration |

---

## Mobile app (`mobile/lib`)

```
main.dart                 start-up only
app/                      wiring: the app shell (theme, language, first screen) and AppDependencies
core/                     shared building blocks, knows nothing about features
  config/ l10n/ network/ services/ theme/ utils/ widgets/ errors/
features/                 one folder per feature
  auth/  profile/  catalog/  booking/  customer/  supplier/  map/
    data/                 repositories: the ONLY code that talks to the API or Firestore
    domain/               plain models (Booking, Service, SupplierAccount...)
    presentation/         screens and widgets
l10n/                     translation files (app_en.arb, app_ne.arb) + generated code
```

### Rules

1. **Dependencies point inward:** `presentation → data → core`. Features may use `core`; `core`
   never imports a feature. A feature may use another feature's `domain` models and widgets
   (e.g. `customer` shows `booking` widgets) but not its repository internals.
2. **Widgets never call the API or Firestore.** They ask a repository
   (`context.read<BookingRepository>().cancel(id)`). That keeps screens simple and testable.
3. **No text in widgets.** Every word the user sees is a translation:
   `context.l10n.sendCode`. Text that arrives from the server in several languages (service
   names) is a `LocalizedText`, shown with `context.text(service.name)`.
4. **Package imports only** (`package:tolely/...`), enforced by the linter, so moving a file
   never breaks imports.
5. **Colours come from `Brand`**, shared widgets live in `core/widgets`.
6. **Use `const` freely.** It is safe: translations register the widget for rebuilds, so even
   `const` widgets change language.

### State and dependency injection

The app uses Flutter's own tools plus the `provider` package:

- `AppDependencies` (`app/app_providers.dart`) creates every repository and service **once** and
  provides them to the whole tree.
- Screens read them with `context.read<T>()`. Tests provide fakes instead (see `test/helpers`).
- Live data uses `StreamBuilder` / `FutureBuilder`; the language uses `LocaleController`.

Moving to Riverpod or Bloc later is possible without touching the data layer. It is worth doing
when several screens start sharing mutable state (chat, wallet, offline queue). Until then the
simple version is easier to read.

### Language

- Text lives in `lib/l10n/app_en.arb` (template) and `app_ne.arb`. After editing, run
  `flutter gen-l10n` (or just `flutter run`).
- `LocaleController` holds the current language, remembers it on the phone, and tells the server
  (so push notifications arrive in the same language). The server's saved language wins at login.
- The test `test/l10n/translations_test.dart` fails if a key is missing in one language.

---

## Backend (`web/src`)

```
app/                    Next.js routes only
  api/**/route.ts       THIN: check who is calling, validate the body, call a service
  admin/ ...            admin console (React)
  page.tsx, partners/, privacy/, terms/    public website
server/                 backend-only code ("server-only")
  http/                 auth (getCaller / requireRole), body parsing, error handling
  firebase.ts           Admin SDK
  collections.ts        the Firestore collection names, in one place
  bookings/             rules.ts (pure) · schemas.ts · bookings.service.ts
  profiles/  suppliers/  catalog/  admin/     same three-part shape
  notifications/        push messages + sending
shared/                 used by server AND browser: service catalog types, geo, small types
client/                 browser-only Firebase helpers
config/site.ts          business details shown on the website
```

### Rules

1. **Routes stay thin** (about ten lines): `requireRole` → `parseBody(schema)` → `service(...)` →
   `Response.json`. Business logic never lives in a route.
2. **A feature = `schemas.ts` + `rules.ts` (pure logic) + `<feature>.service.ts` (database).**
   Pure rules are unit-tested without a database.
3. **Services take the caller as an argument** (`acceptBooking(caller, id)`), so they can be tested
   without HTTP.
4. **Money and trust are server-side.** Prices come from the catalog; status changes are checked
   against `rules.ts`; suppliers must be verified to accept jobs.
5. **Notifications are best-effort** and sent with `after()`, never delaying the response.

### Booking lifecycle

```
            customer books
                 │
              pending ──────── customer / admin cancels ───────▶ cancelled
                 │  ▲
 supplier accepts│  │ supplier releases the job
                 ▼  │
             accepted ─────── customer / admin cancels ───────▶ cancelled
                 │
 supplier starts │
                 ▼
             on_the_way ───── admin cancels ──────────────────▶ cancelled
                 │
 supplier ends   ▼
             completed ──▶ customer rates once (updates the supplier's average)
```

| Who | May do |
|---|---|
| Customer | create, cancel (pending/accepted), rate (completed), report a problem |
| Supplier (verified) | accept, move to on_the_way / completed, release, share location, report a problem |
| Admin | verify/suspend suppliers, cancel open bookings, resolve reports, edit services and prices |

### Money

Customers pay the supplier directly (cash or QR), so Tolely's income is a **platform fee**
collected from suppliers afterwards.

1. The admin sets the fee percentage (Admin → Money). It defaults to **0%**.
2. When a booking is created, the current percentage is **copied onto the booking**, so changing the
   fee later never changes a job that is already booked.
3. When the supplier completes the job: `fee = round(price × percent / 100)`,
   `supplierEarning = price − fee`. The fee is added to the supplier's `feeBalance` (what they owe).
4. The admin records a payment from the supplier (Admin → Money → Record payment). The balance goes
   down and a `settlements` entry is kept. A payment can never exceed what is owed.

The formula exists in two places that must agree: `web/src/server/bookings/fees.ts` and
`Booking.platformFee` in the app. Both have tests with the same cases.

Customers also see their supplier's rating, number of jobs and a verified mark. These are copied onto
the booking when the supplier accepts, so customers never need to read supplier records
(`firestore.rules` keeps those private).

### Notifications

The backend sends a push for each booking event (`server/notifications`). The message carries the
`bookingId`; tapping it (or the "Open" button on a message that arrives while the app is open) opens
that booking, as the customer or the supplier depending on who is signed in
(`PushService.onOpenBooking`, set in `SessionGate`).

### Firestore collections

| Collection | Document | Written by |
|---|---|---|
| `users/{uid}` | role, name, address, language, push tokens | backend |
| `suppliers/{uid}` | services, area, vehicle, `verified`, `online`, rating totals, `feeBalance` (private: owner and admins only) | backend |
| `bookings/{id}` | everything about one job, `status`, `supplierLocation` while on the way | backend |
| `complaints/{id}` | problem reports | backend |
| `settings/app` | business settings (platform fee %) | admin console |
| `settlements/{id}` | payments of platform fees received from suppliers | admin console |
| `services/{key}` | the editable catalog (falls back to the built-in list) | admin console |

---

## Recipes

### Add a translation string
1. Add the key to `mobile/lib/l10n/app_en.arb` **and** `app_ne.arb`.
2. `flutter gen-l10n`, then use `context.l10n.yourKey`.

### Add a third language (e.g. Maithili)
1. Copy `app_en.arb` to `app_mai.arb` and translate.
2. Add `Locale('mai')` to `LocaleController.supported`; add `'mai'` to `LocalizedText.fromFields`
   and to `LANGUAGES` in `web/src/shared/types.ts`; add `nameMai`/`labelMai` to the admin editor.

### Add a service (painter, AC repair, shifting...)
No code needed: **Admin → Services & prices → New service**. For a new *icon*, add it to
`SERVICE_ICONS` (`web/src/shared/services.ts`) and to both maps in
`mobile/lib/features/catalog/presentation/service_style.dart`.

### Add an API endpoint
1. Zod schema in `server/<feature>/schemas.ts`.
2. Pure rule in `rules.ts` if there is one, with a unit test.
3. A function in `<feature>.service.ts` (takes the `Caller`).
4. A thin `app/api/.../route.ts`.
5. An integration test in `web/tests/integration`.

### Add a mobile feature (e.g. "wallet")
1. `features/wallet/domain/` for models, `data/wallet_repository.dart` for API calls.
2. Register the repository in `app/app_providers.dart`.
3. `features/wallet/presentation/` for screens; read the repository with `context.read`.
4. Texts in the `.arb` files. Tests: a model test and a screen test with a fake repository.

---

## Testing

| Command | What it checks | Needs |
|---|---|---|
| `cd mobile && flutter test` | models, language switching, API client, and every main screen with fake data | nothing |
| `cd web && npm run test:unit` | rules, schemas, messages, built-in catalog, **and the website's customer pages** (sign-in, phone verification, booking form, booking cards, which-screen logic) | nothing |
| `cd web && npm run test:integration` | the whole booking lifecycle, permissions, race conditions, admin actions, against a **local database emulator** (never your real data) | Java 21+, `firebase-tools` |
| `cd web && npm test` | both of the above | same |

Before every commit: `flutter analyze`, `npm run lint`, `npm run typecheck`, and the tests above. GitHub runs the same
checks on every push (`.github/workflows/ci.yml`). To publish the apps see [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Deliberate limits (revisit when they start to hurt)

- Live supplier location is sent only while the supplier app is open (background tracking needs
  extra store approvals).
- Map tiles come from OpenStreetMap's free servers (fair-use). Switch provider before heavy traffic.
- Online payment (eSewa/Khalti) is not built; payment is recorded (cash / QR) and settled in person. Tolely's fee is tracked and collected from suppliers (see Money).
- Dates are shown in English formats in both languages (`core/utils/format.dart` is the one place to change).
