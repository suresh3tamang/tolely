# Tolely · टोलेली

Trusted local services from your *tole* (neighborhood): water tankers, tank cleaning,
plumbers, electricians, and more services over time. Starting in Kathmandu.

```
mobile/   Flutter app (Android + iOS), for customers and suppliers
web/      Next.js: Node.js API + admin dashboard (/admin) + landing page
firestore.rules, firestore.indexes.json, firebase.json
```

## How it fits together

```
Flutter app ──(Firebase ID token)──▶ Next.js API ──(Admin SDK)──▶ Firestore
     └──────────── live reads (rules-protected) ◀──────────────────┘
```

- **Login**: phone number + OTP (Firebase Auth). Admins log in to the web dashboard with email/password.
- **Writes** (bookings, accept, status, ratings) all go through the API, which checks roles,
  decides prices from `web/src/lib/services.ts`, and validates status changes.
- **Reads**: the app listens to Firestore directly for live updates. `firestore.rules` blocks all client writes.

Booking flow: `pending` → supplier accepts → `accepted` → `on_the_way` → `completed` → customer rates.
The customer can cancel while `pending` or `accepted`; the supplier can release an accepted job back to `pending`.

## Features

**Mobile app** (customers and suppliers in one app, Nepali/English)
- Phone OTP login, profile, language choice, account deletion
- Customers: browse services and prices, book with time/address/payment choice, live booking
  status with a timeline, call the supplier, cancel, rate, report a problem
- Suppliers: open jobs for their services, accept / on the way / completed / release, call the
  customer, job details, earnings and rating summary, edit details (goes back to verification)
- Push notifications: new jobs for verified suppliers; accepted / on the way / completed /
  cancelled updates for customers
- Maps (OpenStreetMap): customers pin their house when booking; suppliers get one-tap
  directions; customers see the supplier's live location while they're on the way
  (shared every 20 s while the supplier app is open)
- Suppliers can go online / offline (offline = no new-job alerts); customers can "Book again"

**Website**
- Landing page with live service prices, how it works, FAQ
- `/partners` page for tanker owners, plumbers and electricians
- `/privacy` and `/terms` (drafts, needed for Play Store / App Store; review before launch)
- `/admin`: bookings (search, filter, cancel), supplier verification, **service and price
  editor** (add new services without an app update), problem reports

Business details (phone, email, Facebook, store links) live in `web/src/lib/site.ts`.

## Setup

### 1. Firebase project
1. Create a project at https://console.firebase.google.com
2. **Authentication** → enable **Phone** and **Email/Password**
3. **Firestore** → create database
4. Install the CLI and deploy rules and indexes from this folder:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add
   firebase deploy --only firestore
   ```

### 2. Backend (web)
```bash
cd web
cp .env.example .env.local   # fill in values from Firebase console
npm install
npm run dev                  # http://localhost:3000
```
Make your admin account: create an Email/Password user in Firebase console → Authentication, then
```bash
node --env-file=.env.local scripts/make-admin.mjs you@example.com
```
Open http://localhost:3000/admin to verify suppliers and see bookings.

### 3. Mobile app
```bash
dart pub global activate flutterfire_cli
cd mobile
flutterfire configure        # replaces lib/firebase_options.dart
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```
- Android emulator: `http://10.0.2.2:3000` · iOS simulator: `http://localhost:3000` · real phone: your computer's Wi-Fi IP
- Phone OTP on Android needs your app's SHA-1/SHA-256 added in Firebase project settings.
- For testing without real SMS, add **test phone numbers** in Firebase → Authentication → Phone.

### 4. Push notifications
- Android works once Firebase is configured.
- iOS: in Xcode add the **Push Notifications** and **Background Modes → Remote notifications**
  capabilities, and upload an APNs key in Firebase → Project settings → Cloud Messaging.

### 5. Deploy the website
Deploy `web/` to Vercel (or any Node host) with the same environment variables as `.env.local`.
Then build the app with `--dart-define=API_BASE_URL=https://your-domain`.

## Test logins
Firebase test phone numbers (no SMS is sent). **Remove them before public launch**
in Firebase → Authentication → Sign-in method → Phone.

| Number | Code | Use as |
|---|---|---|
| 9800000001 | 111111 | customer |
| 9800000002 | 222222 | supplier |

## Adding a new service
In `/admin` → **Services** → **New service**: set a name, icon and prices, and switch it on.
Customers see it in the app within a few minutes. The default catalog is in
`web/src/lib/services.ts`; to add a new *icon*, add it to `SERVICE_ICONS` there and to
`_serviceIcons` in `mobile/lib/screens/common.dart`.

## Next steps
- Online payment with eSewa / Khalti (needs a merchant account)
- Supplier document upload for verification (needs Firebase Storage, Blaze plan)
- Background location for suppliers (today it's shared while the app is open)
- Paid map tiles before heavy traffic (OpenStreetMap's free tiles have a fair-use policy)
