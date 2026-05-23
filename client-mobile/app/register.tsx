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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Join your coach</Text>
        <Text style={styles.sub}>Use the invite code from your coach.</Text>

        <Text style={styles.label}>Coach invite code *</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="e.g. abc12345"
        />

        <Text style={styles.label}>Your name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />

        {!devOk ? (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
          </>
        ) : null}

        <Pressable style={[styles.primary, busy && styles.disabled]} onPress={() => void onSubmit()} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create account</Text>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Have an account? </Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 24, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  sub: { fontSize: 15, color: "#6b7280", marginBottom: 20 },
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
  disabled: { opacity: 0.6 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { color: "#6b7280", fontSize: 15 },
  link: { color: "#16a34a", fontSize: 15, fontWeight: "600" },
});
