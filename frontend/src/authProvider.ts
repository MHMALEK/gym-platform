import type { AuthProvider } from "@refinedev/core";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

import { apiBootstrap, apiPrefix, authHeaders } from "./lib/api";
import { getFirebaseApp } from "./lib/firebase";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    if (devAuth) {
      localStorage.setItem("access_token", "dev");
      await apiBootstrap();
      return { success: true, redirectTo: "/" };
    }
    const app = getFirebaseApp();
    if (!app) {
      return { success: false, error: { name: "Config", message: "Firebase env not set" } };
    }
    const auth = getAuth(app);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    localStorage.setItem("access_token", token);
    await apiBootstrap();
    return { success: true, redirectTo: "/" };
  },
  logout: async () => {
    if (!devAuth) {
      const app = getFirebaseApp();
      if (app) {
        try {
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
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.logo_url ?? undefined,
    };
  },
  onError: async () => ({ error: undefined }),
};
