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

## Adding a new service
Add an entry to `SERVICES` in `web/src/lib/services.ts` (and its icon in `mobile/lib/screens/common.dart`).
The app reads the catalog from `/api/services`, so no app update is needed for new prices.

## Next steps
- Push notifications (Firebase Cloud Messaging) when a job is accepted / on the way
- Live tanker location on a map
- eSewa / Khalti online payment
- Supplier documents upload for verification
