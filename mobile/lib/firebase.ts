import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { firebaseWebConfig } from "./config";

export function getFirebaseApp() {
  const opts = firebaseWebConfig();
  if (!opts) return null;
  const o: FirebaseOptions = { ...opts };
  return getApps().length ? getApps()[0]! : initializeApp(o);
}

/** Firebase Auth with AsyncStorage persistence (required on React Native). */
export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}
