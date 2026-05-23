import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, typography } from "@/constants/theme";
import { useAuth, useDevAuthAvailable } from "@/contexts/AuthContext";
import { devInviteCode, hasApiBaseUrl } from "@/lib/config";

export default function LoginScreen() {
  const router = useRouter();
  const { token, signInWithPassword, signInDev } = useAuth();
  const devOk = useDevAuthAvailable();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(devInviteCode());
  const [busy, setBusy] = useState(false);

  if (token) {
    router.replace("/(tabs)/home");
    return null;
  }

  const onSubmit = async () => {
    if (!hasApiBaseUrl()) {
      Alert.alert("API URL missing", "Set EXPO_PUBLIC_API_URL in client-mobile/.env");
      return;
    }
    setBusy(true);
    try {
      await signInWithPassword(email, password);
      router.replace("/(tabs)/home");
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDev = async () => {
    if (!hasApiBaseUrl()) {
      Alert.alert("API URL missing", "Set EXPO_PUBLIC_API_URL in client-mobile/.env");
      return;
    }
    setBusy(true);
    try {
      await signInDev(inviteCode);
      router.replace("/(tabs)/home");
    } catch (e) {
      Alert.alert("Dev login failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to view your plan, invoices, and messages."
      footer={
        <Text style={styles.footer}>
          No account?{" "}
          <Link href="/register" asChild>
            <Pressable>
              <Text style={styles.link}>Create one</Text>
            </Pressable>
          </Link>
        </Text>
      }
    >
      <Input
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
      />
      <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
      <Button label="Sign in" onPress={() => void onSubmit()} loading={busy} style={styles.btn} />

      {devOk ? (
        <>
          <Input
            label="Coach invite code"
            hint="Required for first dev signup — copy from coach Settings → Branding"
            autoCapitalize="none"
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="Invite code"
          />
          <Button label="Continue (dev login)" variant="secondary" onPress={() => void onDev()} loading={busy} />
        </>
      ) : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: 4 },
  footer: { ...typography.bodySmall, color: colors.textMuted },
  link: { color: colors.primary, fontWeight: "600" },
});
