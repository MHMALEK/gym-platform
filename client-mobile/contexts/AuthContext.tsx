import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";

import {
  apiClientBootstrap,
  apiGetClientMe,
  type ClientMe,
} from "../lib/api";
import { DEV_CLIENT_TOKEN, devAuthEnabled, devInviteCode } from "../lib/config";
import { getFirebaseAuth } from "../lib/firebase";
import { clearAccessToken, getAccessToken, setAccessToken } from "../lib/token";

type AuthContextValue = {
  ready: boolean;
  token: string | null;
  me: ClientMe | null;
  refreshMe: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInDev: (inviteCode?: string) => Promise<void>;
  register: (email: string, password: string, name: string, inviteCode: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function validateClientSession(): Promise<boolean> {
  try {
    await apiGetClientMe();
    return true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<ClientMe | null>(null);

  const refreshMe = useCallback(async () => {
    const t = await getAccessToken();
    if (!t) {
      setMe(null);
      return;
    }
    try {
      setMe(await apiGetClientMe());
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
        const ok = await validateClientSession();
        if (!ok) {
          await clearAccessToken();
          t = null;
        }
      }
      if (cancelled) return;
      setToken(t);
      if (t) {
        try {
          setMe(await apiGetClientMe());
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
    await apiClientBootstrap({});
    setToken(t);
    setMe(await apiGetClientMe());
  }, []);

  const signInDev = useCallback(async (inviteCode?: string) => {
    await setAccessToken(DEV_CLIENT_TOKEN);
    const code = (inviteCode ?? devInviteCode()).trim();
    await apiClientBootstrap(code ? { invite_code: code } : {});
    setToken(DEV_CLIENT_TOKEN);
    setMe(await apiGetClientMe());
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string, inviteCode: string) => {
      const code = inviteCode.trim();
      if (!code && !devAuthEnabled()) {
        throw new Error("Coach invite code is required.");
      }
      if (devAuthEnabled()) {
        await setAccessToken(DEV_CLIENT_TOKEN);
        await apiClientBootstrap({ invite_code: code || undefined, name: name.trim() || undefined });
        setToken(DEV_CLIENT_TOKEN);
        setMe(await apiGetClientMe());
        return;
      }
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured.");
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const t = await cred.user.getIdToken();
      await setAccessToken(t);
      await apiClientBootstrap({ invite_code: code, name: name.trim() || undefined });
      setToken(t);
      setMe(await apiGetClientMe());
    },
    [],
  );

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
      register,
      signOut,
    }),
    [ready, token, me, refreshMe, signInWithPassword, signInDev, register, signOut],
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
