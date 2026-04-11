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

import { ChoiceRow } from "@/components/ChoiceRow";
import { ApiError } from "@/lib/api";
import { createClient } from "@/lib/clients";

const STATUS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const ACCOUNT = [
  { value: "good_standing", label: "Good" },
  { value: "payment_issue", label: "Payment" },
  { value: "onboarding", label: "Onboard" },
  { value: "churned", label: "Churned" },
];

export default function ClientNewScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");
  const [accountStatus, setAccountStatus] = useState("good_standing");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      Alert.alert("Validation", "Name is required.");
      return;
    }
    setBusy(true);
    try {
      const c = await createClient({
        name: n,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        status,
        account_status: accountStatus,
      });
      router.replace(`/(tabs)/clients/${c.id}`);
    } catch (e) {
      Alert.alert("Could not create client", e instanceof ApiError ? e.message : String(e));
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
        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="email@example.com"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <ChoiceRow label="Status" value={status} options={STATUS} onChange={setStatus} />
        <ChoiceRow label="Account" value={accountStatus} options={ACCOUNT} onChange={setAccountStatus} />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          multiline
        />

        <Pressable style={[styles.primary, busy && styles.disabled]} onPress={() => void save()} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create client</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  primary: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.6 },
});
