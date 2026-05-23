import type { AuthProvider } from "@refinedev/core";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

import {
  apiClientBootstrap,
  clearUserRole,
  DEV_CLIENT_TOKEN,
  setUserRole,
} from "./lib/authApi";
import { apiPrefix, authHeaders } from "./lib/api";
import { getFirebaseApp } from "./lib/firebase";

const devAuth = import.meta.env.VITE_DEV_AUTH === "true";

export const clientAuthProvider: AuthProvider = {
  login: async ({ email, password, invite_code: inviteCode }) => {
    if (devAuth) {
      localStorage.setItem("access_token", DEV_CLIENT_TOKEN);
      setUserRole("client");
      await apiClientBootstrap({
        invite_code: typeof inviteCode === "string" ? inviteCode : undefined,
      });
      return { success: true, redirectTo: "/client" };
    }
    const app = getFirebaseApp();
    if (!app) {
      return { success: false, error: { name: "Config", message: "Firebase env not set" } };
    }
    const auth = getAuth(app);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    localStorage.setItem("access_token", token);
    setUserRole("client");
    await apiClientBootstrap({});
    return { success: true, redirectTo: "/client" };
  },
  register: async ({ email, password, name, invite_code: inviteCode }) => {
    const code = String(inviteCode ?? "").trim();
    if (!code && !devAuth) {
      return {
        success: false,
        error: { name: "Invite", message: "Coach invite code is required" },
      };
    }
    if (devAuth) {
      localStorage.setItem("access_token", DEV_CLIENT_TOKEN);
      setUserRole("client");
      await apiClientBootstrap({
        invite_code: code || undefined,
        name: typeof name === "string" ? name : undefined,
      });
      return { success: true, redirectTo: "/client" };
    }
    const app = getFirebaseApp();
    if (!app) {
      return { success: false, error: { name: "Config", message: "Firebase env not set" } };
    }
    const auth = getAuth(app);
    const cred = await createUserWithEmailAndPassword(auth, String(email), String(password));
    const token = await cred.user.getIdToken();
    localStorage.setItem("access_token", token);
    setUserRole("client");
    await apiClientBootstrap({
      invite_code: code,
      name: typeof name === "string" ? name : undefined,
    });
    return { success: true, redirectTo: "/client" };
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
    return { success: true, redirectTo: "/client/login" };
  },
  check: async () => {
    const t = localStorage.getItem("access_token");
    if (!t) {
      return { authenticated: false, redirectTo: "/client/login", logout: true };
    }
    if (localStorage.getItem("user_role") === "coach") {
      return { authenticated: false, redirectTo: "/login", logout: true };
    }
    const res = await fetch(`${apiPrefix}/client/me`, { headers: authHeaders() });
    if (!res.ok) {
      return { authenticated: false, redirectTo: "/client/login", logout: true };
    }
    return { authenticated: true };
  },
  getPermissions: async () => null,
  getIdentity: async () => {
    const res = await fetch(`${apiPrefix}/client/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    const u = await res.json();
    return { id: u.id, name: u.name, email: u.email ?? undefined };
  },
  onError: async () => ({ error: undefined }),
};
