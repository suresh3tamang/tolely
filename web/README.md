# Tolely web

Next.js: public website, admin console (`/admin`) and the backend API (`/api/*`).
Architecture and conventions: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

```bash
cp .env.example .env.local      # fill in the Firebase keys
npm install
npm run dev                     # http://localhost:3000   (-- -H 0.0.0.0 to reach it from a phone)
npm test                        # unit + page tests + integration (integration needs Java 21+ and firebase-tools)
npm run lint && npm run typecheck && npm run build
```

Make an admin: `node --env-file=.env.local scripts/make-admin.mjs <email or uid>`
