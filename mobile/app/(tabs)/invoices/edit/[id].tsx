import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
} from "react-native";

import { ChoiceRow } from "@/components/ChoiceRow";
import { ApiError } from "@/lib/api";
import { getInvoice, updateInvoice, type InvoiceRow } from "@/lib/invoices";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

export default function InvoiceEditScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const id = Number(idParam);

  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("");
  const [externalPaymentId, setExternalPaymentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    try {
      const inv: InvoiceRow = await getInvoice(id);
      setReference(inv.reference ?? "");
      setAmount(inv.amount != null ? String(inv.amount) : "");
      setCurrency(inv.currency ?? "USD");
      setDueDate(inv.due_date ? String(inv.due_date).slice(0, 10) : "");
      setStatus(inv.status ?? "pending");
      setNotes(inv.notes ?? "");
      setInternalNotes(inv.internal_notes ?? "");
      setPaidAt(inv.paid_at ? String(inv.paid_at) : "");
      setPaymentProvider(inv.payment_provider ?? "");
      setExternalPaymentId(inv.external_payment_id ?? "");
    } catch (e) {
      Alert.alert("Load failed", e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const amt = amount.trim() === "" ? null : Number(amount);
    if (amt != null && Number.isNaN(amt)) {
      Alert.alert("Validation", "Amount must be a number.");
      return;
    }
    setBusy(true);
    try {
      await updateInvoice(id, {
        reference: reference.trim() || null,
        amount: amt,
        currency: currency.trim() || "USD",
        due_date: dueDate.trim() || null,
        status: status as InvoiceRow["status"],
        notes: notes.trim() || null,
        internal_notes: internalNotes.trim() || null,
        paid_at: paidAt.trim() ? paidAt.trim() : null,
        payment_provider: paymentProvider.trim() || null,
        external_payment_id: externalPaymentId.trim() || null,
      });
      router.replace(`/(tabs)/invoices/${id}`);
    } catch (e) {
      Alert.alert("Could not save", e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 48 }} size="large" />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Reference</Text>
        <TextInput style={styles.input} value={reference} onChangeText={setReference} />

        <Text style={styles.label}>Amount</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

        <Text style={styles.label}>Currency</Text>
        <TextInput style={styles.input} value={currency} onChangeText={setCurrency} maxLength={8} />

        <Text style={styles.label}>Due date (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} />

        <ChoiceRow label="Status" value={status} options={STATUSES} onChange={setStatus} />

        {status === "paid" ? (
          <>
            <Text style={styles.label}>Paid at (ISO datetime)</Text>
            <TextInput
              style={styles.input}
              value={paidAt}
              onChangeText={setPaidAt}
              placeholder="2026-04-11T12:00:00.000Z"
            />
          </>
        ) : null}

        <Text style={styles.label}>Notes (client)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} multiline />

        <Text style={styles.label}>Internal notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={internalNotes}
          onChangeText={setInternalNotes}
          multiline
        />

        <Text style={styles.label}>Payment provider</Text>
        <TextInput style={styles.input} value={paymentProvider} onChangeText={setPaymentProvider} />

        <Text style={styles.label}>External payment id</Text>
        <TextInput style={styles.input} value={externalPaymentId} onChangeText={setExternalPaymentId} />

        <Pressable style={[styles.primary, busy && styles.disabled]} onPress={() => void save()} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save</Text>}
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
});
