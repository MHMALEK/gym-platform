/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_DEV_AUTH: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  /** e.g. my-project.appspot.com — required for Firebase Storage uploads */
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Set to "false" to force API disk upload even when Storage is configured */
  readonly VITE_USE_FIREBASE_STORAGE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
