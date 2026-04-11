/** Same-origin not available on device; set full API origin (e.g. https://api.example.com). */
export function apiBaseUrl(): string {
  const u = process.env.EXPO_PUBLIC_API_URL ?? "";
  return u.replace(/\/$/, "");
}

export function hasApiBaseUrl(): boolean {
  return apiBaseUrl().length > 0;
}

export function apiPrefix(): string {
  return `${apiBaseUrl()}/api/v1`;
}

export function devAuthEnabled(): boolean {
  return process.env.EXPO_PUBLIC_DEV_AUTH === "true";
}

type FirebaseWebOpts = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

export function firebaseWebConfig(): FirebaseWebOpts | null {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "";
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  if (!apiKey || !authDomain || !projectId) return null;
  const o: FirebaseWebOpts = { apiKey, authDomain, projectId };
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (storageBucket) o.storageBucket = storageBucket;
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  if (messagingSenderId) o.messagingSenderId = messagingSenderId;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  if (appId) o.appId = appId;
  return o;
}
