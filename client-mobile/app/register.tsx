import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, typography } from "@/constants/theme";
import { useAuth, useDevAuthAvailable } from "@/contexts/AuthContext";
import { hasApiBaseUrl } from "@/lib/config";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const devOk = useDevAuthAvailable();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!hasApiBaseUrl()) {
      Alert.alert("API URL missing", "Set EXPO_PUBLIC_API_URL in client-mobile/.env");
      return;
    }
    if (!inviteCode.trim()) {
      Alert.alert("Invite required", "Enter your coach's invite code.");
      return;
    }
    setBusy(true);
    try {
      await register(email, password, name, inviteCode);
      router.replace("/(tabs)/home");
    } catch (e) {
      Alert.alert("Sign up failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen
      title="Join your coach"
      subtitle="Use the invite code your coach shared with you."
      footer={
        <Text style={styles.footer}>
          Already registered?{" "}
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </Link>
        </Text>
      }
    >
      <Input
        label="Coach invite code"
        autoCapitalize="none"
        value={inviteCode}
        onChangeText={setInviteCode}
        placeholder="e.g. abc12345"
      />
      <Input label="Your name" value={name} onChangeText={setName} placeholder="Full name" autoComplete="name" />

      {!devOk ? (
        <>
          <Input
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />
          <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="Min. 6 characters" />
        </>
      ) : null}

      <Button label="Create account" onPress={() => void onSubmit()} loading={busy} style={styles.btn} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: 4 },
  footer: { ...typography.bodySmall, color: colors.textMuted },
  link: { color: colors.primary, fontWeight: "600" },
});
