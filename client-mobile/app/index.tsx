import { Redirect } from "expo-router";

import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { ready, token } = useAuth();
  if (!ready) return <LoadingState label="Starting…" />;
  if (!token) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)/home" />;
}
