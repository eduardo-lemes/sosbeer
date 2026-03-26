import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is missing");
  return JSON.parse(raw) as ServiceAccount;
}

const app =
  getApps().length > 0
    ? getApps()[0]!
    : initializeApp({ credential: cert(getServiceAccount()) });

export const db = getFirestore(app);
