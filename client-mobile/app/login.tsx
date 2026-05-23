import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>My Coaching</Text>
        <Text style={styles.sub}>Client sign in</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
        />

        <Pressable style={[styles.primary, busy && styles.disabled]} onPress={() => void onSubmit()} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Sign in</Text>}
        </Pressable>

        {devOk ? (
          <>
            <Text style={[styles.label, { marginTop: 20 }]}>Invite code (first dev signup)</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="from coach branding settings"
            />
            <Pressable style={[styles.secondary, busy && styles.disabled]} onPress={() => void onDev()} disabled={busy}>
              <Text style={styles.secondaryText}>Continue (dev client login)</Text>
            </Pressable>
          </>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>No account? </Text>
          <Link href="/register" asChild>
            <Pressable>
              <Text style={styles.link}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 24, paddingTop: 32 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  sub: { fontSize: 15, color: "#6b7280", marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  primary: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondary: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { fontSize: 16, color: "#374151" },
  disabled: { opacity: 0.6 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { color: "#6b7280", fontSize: 15 },
  link: { color: "#16a34a", fontSize: 15, fontWeight: "600" },
});
