import type { AuthProvider } from "@refinedev/core";
import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

import { apiBootstrap, apiPrefix, authHeaders } from "./lib/api";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

function firebaseOptions(): FirebaseOptions | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !authDomain || !projectId) return null;
  return { apiKey, authDomain, projectId };
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    if (devAuth) {
      localStorage.setItem("access_token", "dev");
      await apiBootstrap();
      return { success: true, redirectTo: "/" };
    }
    const opts = firebaseOptions();
    if (!opts) {
      return { success: false, error: { name: "Config", message: "Firebase env not set" } };
    }
    const app = getApps().length ? getApps()[0]! : initializeApp(opts);
    const auth = getAuth(app);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    localStorage.setItem("access_token", token);
    await apiBootstrap();
    return { success: true, redirectTo: "/" };
  },
  logout: async () => {
    if (!devAuth) {
      const opts = firebaseOptions();
      if (opts) {
        try {
          const app = getApps().length ? getApps()[0]! : initializeApp(opts);
          await signOut(getAuth(app));
        } catch {
          /* ignore */
        }
      }
    }
    localStorage.removeItem("access_token");
    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    const t = localStorage.getItem("access_token");
    return t ? { authenticated: true } : { authenticated: false, redirectTo: "/login", logout: true };
  },
  getPermissions: async () => null,
  getIdentity: async () => {
    const res = await fetch(`${apiPrefix}/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    const u = await res.json();
    return { id: u.id, name: u.name, email: u.email, avatar: undefined };
  },
  onError: async () => ({ error: undefined }),
};
