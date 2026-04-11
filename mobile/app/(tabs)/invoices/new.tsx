import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChoiceRow } from "@/components/ChoiceRow";
import { ApiError } from "@/lib/api";
import { listClients, type ClientRow } from "@/lib/clients";
import { createInvoice } from "@/lib/invoices";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

export default function InvoiceNewScreen() {
  const router = useRouter();
  const { client_id: clientIdParam } = useLocalSearchParams<{ client_id?: string }>();
  const presetClientId = clientIdParam ? Number(clientIdParam) : undefined;

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientId, setClientId] = useState<number | null>(presetClientId ?? null);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      const { items } = await listClients({ limit: 200, offset: 0 });
      setClients(items);
    } catch (e) {
      Alert.alert("Could not load clients", e instanceof ApiError ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (presetClientId && Number.isFinite(presetClientId)) {
      setClientId(presetClientId);
    }
  }, [presetClientId]);

  const selectedName = clients.find((c) => c.id === clientId)?.name ?? "Select client";

  const save = async () => {
    if (clientId == null) {
      Alert.alert("Validation", "Choose a client.");
      return;
    }
    const amt = amount.trim() === "" ? null : Number(amount);
    if (amt != null && Number.isNaN(amt)) {
      Alert.alert("Validation", "Amount must be a number.");
      return;
    }
    setBusy(true);
    try {
      const inv = await createInvoice({
        client_id: clientId,
        reference: reference.trim() || null,
        amount: amt,
        currency: currency.trim() || "USD",
        due_date: dueDate.trim() || null,
        status,
        notes: notes.trim() || null,
        internal_notes: internalNotes.trim() || null,
      });
      router.replace(`/(tabs)/invoices/${inv.id}`);
    } catch (e) {
      Alert.alert("Could not create invoice", e instanceof ApiError ? e.message : String(e));
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
        <Text style={styles.label}>Client *</Text>
        <Pressable style={styles.input} onPress={() => setPickerOpen(true)}>
          <Text style={styles.inputText}>{selectedName}</Text>
        </Pressable>

        <Text style={styles.label}>Reference</Text>
        <TextInput
          style={styles.input}
          value={reference}
          onChangeText={setReference}
          placeholder="Optional — auto if empty"
        />

        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <Text style={styles.label}>Currency</Text>
        <TextInput style={styles.input} value={currency} onChangeText={setCurrency} maxLength={8} />

        <Text style={styles.label}>Due date (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="2026-04-15" />

        <ChoiceRow label="Status" value={status} options={STATUSES} onChange={setStatus} />

        <Text style={styles.label}>Notes (client)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} multiline />

        <Text style={styles.label}>Internal notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={internalNotes}
          onChangeText={setInternalNotes}
          multiline
        />

        <Pressable style={[styles.primary, busy && styles.disabled]} onPress={() => void save()} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create invoice</Text>}
        </Pressable>
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose client</Text>
            <FlatList
              data={clients}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalRow}
                  onPress={() => {
                    setClientId(item.id);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{item.name}</Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.modalClose} onPress={() => setPickerOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    justifyContent: "center",
  },
  inputText: { fontSize: 16, color: "#111827" },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  primary: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.6 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    maxHeight: "70%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", paddingHorizontal: 16, marginBottom: 8 },
  modalRow: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },
  modalRowText: { fontSize: 16 },
  modalClose: { padding: 16, alignItems: "center" },
  modalCloseText: { fontSize: 16, color: "#2563eb", fontWeight: "600" },
});
