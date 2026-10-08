// Gives an existing Firebase Auth user (by email or UID) the admin role.
// First create the user (Email/Password) in the Firebase console, then run:
//   node --env-file=.env.local scripts/make-admin.mjs admin@example.com   (or a UID)
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const who = process.argv[2];
if (!who) {
  console.error("Usage: node --env-file=.env.local scripts/make-admin.mjs <email or uid>");
  process.exit(1);
}

const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail } = process.env;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
initializeApp(
  process.env.FIRESTORE_EMULATOR_HOST || !privateKey
    ? { projectId }
    : { credential: cert({ projectId, clientEmail, privateKey }) },
);

const user = who.includes("@") ? await getAuth().getUserByEmail(who) : await getAuth().getUser(who);
await getFirestore()
  .collection("users")
  .doc(user.uid)
  .set({ role: "admin", name: "Admin", email: user.email ?? null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
console.log(`${user.email ?? user.uid} (${user.uid}) is now an admin.`);
