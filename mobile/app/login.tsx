import { useRouter } from "expo-router";
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
import { hasApiBaseUrl } from "@/lib/config";

export default function LoginScreen() {
  const router = useRouter();
  const { token, signInWithPassword, signInDev } = useAuth();
  const devOk = useDevAuthAvailable();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (token) {
    router.replace("/(tabs)/clients");
    return null;
  }

  const onSubmit = async () => {
    if (!hasApiBaseUrl()) {
      Alert.alert(
        "API URL missing",
        "Set EXPO_PUBLIC_API_URL to your API origin (e.g. http://127.0.0.1:8000 for local backend).",
      );
      return;
    }
    setBusy(true);
    try {
      await signInWithPassword(email, password);
      router.replace("/(tabs)/clients");
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDev = async () => {
    if (!hasApiBaseUrl()) {
      Alert.alert("API URL missing", "Set EXPO_PUBLIC_API_URL in mobile/.env");
      return;
    }
    setBusy(true);
    try {
      await signInDev();
      router.replace("/(tabs)/clients");
    } catch (e) {
      Alert.alert("Dev login failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Gym Coach</Text>
        <Text style={styles.sub}>Coach sign in</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
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
          <Pressable style={[styles.secondary, busy && styles.disabled]} onPress={() => void onDev()} disabled={busy}>
            <Text style={styles.secondaryText}>Continue (dev login)</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 24, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  sub: { fontSize: 15, color: "#6b7280", marginBottom: 28 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  primary: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondary: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { fontSize: 16, color: "#374151" },
  disabled: { opacity: 0.6 },
});
