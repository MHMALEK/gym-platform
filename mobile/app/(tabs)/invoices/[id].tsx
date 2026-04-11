import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "@/lib/api";
import { getInvoice, deleteInvoice, type InvoiceRow } from "@/lib/invoices";
import { shareInvoicePdf } from "@/lib/invoicePdf";

export default function InvoiceDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const id = Number(idParam);
  const [inv, setInv] = useState<InvoiceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    try {
      setInv(await getInvoice(id));
    } catch (e) {
      Alert.alert("Error", e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = () => {
    Alert.alert("Delete invoice", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteInvoice(id);
              router.replace("/(tabs)/invoices");
            } catch (e) {
              Alert.alert("Error", e instanceof ApiError ? e.message : String(e));
            }
          })();
        },
      },
    ]);
  };

  const onPdf = async () => {
    if (!inv) return;
    setPdfBusy(true);
    try {
      await shareInvoicePdf(inv.id, inv.reference);
    } catch (e) {
      Alert.alert("PDF", e instanceof Error ? e.message : String(e));
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading || !inv) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>{inv.reference || `Invoice #${inv.id}`}</Text>
      <Text style={styles.line}>Client: {inv.client?.name ?? "—"}</Text>
      <Text style={styles.line}>
        Amount: {inv.amount != null ? `${inv.amount} ${inv.currency}` : "—"}
      </Text>
      <Text style={styles.line}>Status: {inv.status}</Text>
      <Text style={styles.line}>Due: {inv.due_date ?? "—"}</Text>
      {inv.notes ? <Text style={styles.block}>Notes: {inv.notes}</Text> : null}
      {inv.internal_notes ? <Text style={styles.block}>Internal: {inv.internal_notes}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={() => router.push(`/(tabs)/invoices/edit/${id}`)}>
          <Text style={styles.btnText}>Edit</Text>
        </Pressable>
        <Pressable style={[styles.btn, pdfBusy && styles.disabled]} onPress={() => void onPdf()} disabled={pdfBusy}>
          <Text style={styles.btnText}>{pdfBusy ? "…" : "Share PDF"}</Text>
        </Pressable>
        <Pressable style={styles.btnDanger} onPress={onDelete}>
          <Text style={styles.btnDangerText}>Delete</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  line: { fontSize: 16, color: "#374151", marginBottom: 6 },
  block: { marginTop: 12, fontSize: 15, lineHeight: 22, color: "#111827" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 24 },
  btn: {
    backgroundColor: "#eff6ff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  btnText: { color: "#1d4ed8", fontWeight: "600" },
  btnDanger: {
    backgroundColor: "#fef2f2",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  btnDangerText: { color: "#b91c1c", fontWeight: "600" },
  disabled: { opacity: 0.6 },
});
