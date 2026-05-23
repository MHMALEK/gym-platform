import type { AuthProvider } from "@refinedev/core";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

import { apiBootstrap, apiWhoami, clearUserRole, getUserRole, setUserRole } from "./lib/authApi";
import { apiPrefix, authHeaders } from "./lib/api";
import { getFirebaseApp } from "./lib/firebase";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    if (devAuth) {
      localStorage.setItem("access_token", "dev");
      setUserRole("coach");
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
    setUserRole("coach");
    await apiBootstrap();
    return { success: true, redirectTo: "/" };
  },
  register: async ({ email, password, name }) => {
    if (devAuth) {
      localStorage.setItem("access_token", "dev");
      setUserRole("coach");
      await apiBootstrap();
      return { success: true, redirectTo: "/" };
    }
    const app = getFirebaseApp();
    if (!app) {
      return { success: false, error: { name: "Config", message: "Firebase env not set" } };
    }
    const auth = getAuth(app);
    const cred = await createUserWithEmailAndPassword(auth, String(email), String(password));
    if (name && typeof name === "string" && name.trim()) {
      // Display name is optional; bootstrap uses email if name unset.
    }
    const token = await cred.user.getIdToken();
    localStorage.setItem("access_token", token);
    setUserRole("coach");
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
    clearUserRole();
    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    const t = localStorage.getItem("access_token");
    if (!t) {
      return { authenticated: false, redirectTo: "/login", logout: true };
    }
    const role = getUserRole();
    if (role === "client") {
      return { authenticated: false, redirectTo: "/client/login", logout: true };
    }
    if (!role) {
      try {
        const who = await apiWhoami();
        if (who.role === "client") {
          return { authenticated: false, redirectTo: "/client/login", logout: true };
        }
        if (who.role === "coach") {
          setUserRole("coach");
        }
      } catch {
        /* allow coach routes to surface API errors */
      }
    }
    return { authenticated: true };
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
