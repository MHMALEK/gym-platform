import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";

/**
 * Web SDK config from env. `storageBucket` is required for Firebase Storage uploads.
 * Values come from Firebase console → Project settings → Your apps → Web app.
 */
export function firebaseWebConfig(): FirebaseOptions | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !authDomain || !projectId) return null;

  const opts: FirebaseOptions = { apiKey, authDomain, projectId };
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (storageBucket) opts.storageBucket = storageBucket;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  if (messagingSenderId) opts.messagingSenderId = messagingSenderId;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (appId) opts.appId = appId;
  return opts;
}

export function getFirebaseApp() {
  const opts = firebaseWebConfig();
  if (!opts) return null;
  return getApps().length ? getApps()[0]! : initializeApp(opts);
}
