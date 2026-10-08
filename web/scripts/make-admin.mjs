// Gives an existing Firebase Auth user the admin role.
// First create the user (Email/Password) in the Firebase console, then run:
//   node --env-file=.env.local scripts/make-admin.mjs admin@example.com
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/make-admin.mjs <email>");
  process.exit(1);
}

const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail } = process.env;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
initializeApp(
  process.env.FIRESTORE_EMULATOR_HOST || !privateKey
    ? { projectId }
    : { credential: cert({ projectId, clientEmail, privateKey }) },
);

const user = await getAuth().getUserByEmail(email);
await getFirestore()
  .collection("users")
  .doc(user.uid)
  .set({ role: "admin", name: "Admin", email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
console.log(`${email} (${user.uid}) is now an admin.`);
