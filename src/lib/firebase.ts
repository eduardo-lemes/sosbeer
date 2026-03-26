import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length > 0) return getApps()[0]!;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    // Production / Vercel: use real service account
    return initializeApp({ credential: cert(JSON.parse(raw) as ServiceAccount) });
  }

  // Local dev without credentials: use emulator or project ID only
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "sosbeer-dev";
  console.warn(
    `⚠ FIREBASE_SERVICE_ACCOUNT not set – initializing with projectId="${projectId}".` +
    ` Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 to use the emulator.`,
  );
  return initializeApp({ projectId });
}

const app = initAdmin();
export const db = getFirestore(app);
