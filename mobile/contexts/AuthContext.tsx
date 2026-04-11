import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";

import { apiBootstrap, apiGetMe } from "../lib/api";
import { devAuthEnabled } from "../lib/config";
import { getFirebaseAuth } from "../lib/firebase";
import { clearAccessToken, getAccessToken, setAccessToken } from "../lib/token";

type AuthState = {
  ready: boolean;
  token: string | null;
  me: { id: number; name?: string; email?: string | null } | null;
};

type AuthContextValue = AuthState & {
  refreshMe: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInDev: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function validateToken(token: string): Promise<boolean> {
  try {
    await apiGetMe();
    return true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<AuthState["me"]>(null);

  const refreshMe = useCallback(async () => {
    const t = await getAccessToken();
    if (!t) {
      setMe(null);
      return;
    }
    try {
      const u = await apiGetMe();
      setMe(u);
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let t = await getAccessToken();
      const auth = getFirebaseAuth();
      if (!t && auth?.currentUser) {
        try {
          t = await auth.currentUser.getIdToken();
          await setAccessToken(t);
        } catch {
          t = null;
        }
      }
      if (t) {
        const ok = await validateToken(t);
        if (!ok) {
          await clearAccessToken();
          t = null;
        }
      }
      if (cancelled) return;
      setToken(t);
      if (t) {
        try {
          setMe(await apiGetMe());
        } catch {
          setMe(null);
        }
      } else {
        setMe(null);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured (set EXPO_PUBLIC_FIREBASE_* env).");
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const t = await cred.user.getIdToken();
    await setAccessToken(t);
    await apiBootstrap();
    setToken(t);
    setMe(await apiGetMe());
  }, []);

  const signInDev = useCallback(async () => {
    await setAccessToken("dev");
    await apiBootstrap();
    setToken("dev");
    setMe(await apiGetMe());
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth?.currentUser) {
      try {
        await firebaseSignOut(auth);
      } catch {
        /* ignore */
      }
    }
    await clearAccessToken();
    setToken(null);
    setMe(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      token,
      me,
      refreshMe,
      signInWithPassword,
      signInDev,
      signOut,
    }),
    [ready, token, me, refreshMe, signInWithPassword, signInDev, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useDevAuthAvailable(): boolean {
  return devAuthEnabled();
}
