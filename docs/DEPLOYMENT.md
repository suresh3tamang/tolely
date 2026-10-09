# Going live

Today the backend runs on a developer's computer and the phone app talks to it over Wi-Fi.
To launch, three things must be online: **Firebase** (already is), the **website + backend**
(deploy it), and the **apps** (publish them).

```
Customers' & suppliers' phones ──HTTPS──▶ https://your-domain  (website, admin, /api)  ──▶ Firebase
```

## 1. Deploy the website and backend

Any Node host works; these steps use [Vercel](https://vercel.com).

1. Push the repository to GitHub (already done) and **Import** it in Vercel.
2. Set **Root Directory** to `web`. The framework is detected as Next.js.
3. Add the **environment variables** from `web/.env.example` (Project Settings → Environment Variables):
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and the four
   `NEXT_PUBLIC_FIREBASE_*` values. The private key can be pasted as it is (multi-line) or with `\n`.
   Also set `ANTHROPIC_API_KEY` (optional: smarter, paid voice booking; free word rules work without it) and `PLACES_USER_AGENT` (place search, with a contact address).
   Set `CRON_SECRET` (any long random text) for the late-booking check. `web/vercel.json` asks Vercel to call
   `/api/cron/late-bookings` every 10 minutes; Vercel's free Hobby plan only runs crons once a day, so on Hobby
   use a free scheduler such as cron-job.org instead: GET `https://<your-domain>/api/cron/late-bookings` every
   10 minutes with the header `Authorization: Bearer <CRON_SECRET>`.
4. Deploy, then open `https://your-domain/api/services`. It should list the services.
5. Firebase console → Authentication → Settings → **Authorized domains** → add your domain.
6. Fill in `web/src/config/site.ts` (phone, email, Facebook, store links) and redeploy.
7. Create your admin account (see `web/README.md`) and sign in at `https://your-domain/admin`.

> Use a **new** Firebase service-account key for production. If a key was ever pasted into a chat
> or committed, delete it in Google Cloud Console → IAM → Service accounts → Keys and create a new one.

## 2. Firebase

| Do | Where |
|---|---|
| **Turn on Google sign-in** (needed for website customers): Authentication → Sign-in method → **Google** → Enable → pick a support email → Save | Firebase console |
| Add your website's domain (e.g. `tolely.com`) | Authentication → Settings → **Authorized domains** (`localhost` is already allowed for testing) |
| Deploy rules and indexes: `firebase deploy --only firestore` | terminal, from the repo root |
| **Remove the test phone numbers** (`9800000001`, `9800000002`) | Authentication → Sign-in method → Phone |
| Keep the SMS region policy on **Nepal only** | Authentication → Settings → SMS region policy |
| Real SMS needs a billing account (Blaze plan, pay as you go) | Project settings → Usage and billing |
| Set a budget alert so a surprise bill can't happen | Google Cloud Console → Billing → Budgets |

## 3. Android (Google Play)

1. **Create an upload key** (once; keep the file and passwords safe, and back them up):
   ```bash
   keytool -genkey -v -keystore ~/tolely-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. Create `mobile/android/key.properties` (it is git-ignored):
   ```
   storeFile=/Users/you/tolely-upload.jks
   storePassword=...
   keyAlias=upload
   keyPassword=...
   ```
   The build uses it automatically (`android/app/build.gradle.kts`); without it, release builds are
   signed with the debug key, which Google Play rejects.
3. Add the key's fingerprints to Firebase so phone login works in the release app
   (Project settings → Your apps → Android → Add fingerprint). Print them with:
   ```bash
   keytool -list -v -keystore ~/tolely-upload.jks -alias upload
   ```
   When you enable **Play App Signing**, also add the *app signing key* fingerprints shown in
   Play Console → App integrity.
4. In `mobile/android/app/src/main/res/xml/network_security_config.xml`, delete the two testing
   addresses. They only allow plain HTTP to a computer on the local network; production uses HTTPS.
5. Build the bundle with your production address:
   ```bash
   cd mobile
   flutter build appbundle --release --dart-define=API_BASE_URL=https://your-domain
   ```
   Upload `build/app/outputs/bundle/release/app-release.aab` in Play Console.
6. Raise the version in `mobile/pubspec.yaml` (`version: 1.0.0+1`: the number after `+` must go up
   for every upload).

## 4. iPhone (App Store)

1. Join the **Apple Developer Program** and create the app in App Store Connect with bundle id `com.tolely.app`.
2. Open `mobile/ios/Runner.xcworkspace` in Xcode, choose your **Team**, and add the capabilities
   **Push Notifications** and **Background Modes → Remote notifications**.
3. Create an **APNs Authentication Key** in the Apple developer site and upload it in Firebase
   console → Project settings → Cloud Messaging. Without it, iPhones receive no notifications.
4. `flutter build ipa --release --dart-define=API_BASE_URL=https://your-domain`, then upload with Xcode or Transporter.

## 5. Store listings

Both stores ask for the same things. Have these ready:

- **Privacy policy URL:** `https://your-domain/privacy` (a draft: have it reviewed first)
- **Terms URL:** `https://your-domain/terms`
- **Account deletion:** in the app under Profile → Delete account (already built; both stores require it)
- **Permissions to explain:** location (pin your house; share your position with a customer while on the way) and notifications
- **Data you collect:** phone number, name, address, location, booking history
- Screenshots (phone sizes), a short and a long description in Nepali and English, the app icon (`brand/icon.png`)

Store rules change: check the current requirements in Play Console and App Store Connect before submitting.

## 6. Pre-launch checklist

- [ ] Google sign-in turned on in Firebase, and the production domain added to Authorized domains
- [ ] A customer booking tried on the website end to end (Google → verify phone → book), and the same phone number then opened in the app
- [ ] Production service-account key created; any old/leaked key deleted
- [ ] Test phone numbers removed
- [ ] `web/src/config/site.ts` filled in; privacy policy and terms reviewed
- [ ] Platform fee decided and set (Admin → Money); default is off
- [ ] Several real suppliers verified in the admin console
- [ ] A full booking tried end to end on a real phone, in both languages
- [ ] Release-signed Android build installed and phone login works
- [ ] iPhone push key uploaded (if launching on iPhone)
- [ ] Map tiles (app and website): OpenStreetMap's free servers are for light use; plan a paid provider before heavy traffic
- [ ] The website is served over **HTTPS**, otherwise browsers won't share the customer's location
- [ ] Billing alert set in Google Cloud

## What is still manual

- **Online payment** (eSewa / Khalti) is not built; payment is cash or QR, settled between customer and supplier.
  Tolely's fee is tracked in Admin → Money and collected from suppliers.
- **Supplier document upload** needs Firebase Storage (billing plan); today the team checks documents by phone or in person.
- **Background location** while the app is closed is not included.
