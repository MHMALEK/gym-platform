import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError, apiGetClientInvoice, type ClientInvoice } from "@/lib/api";
import { shareClientInvoicePdf } from "@/lib/invoicePdf";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceId = Number(id);
  const [inv, setInv] = useState<ClientInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(invoiceId)) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetClientInvoice(invoiceId);
        if (!cancelled) setInv(data);
      } catch (e) {
        if (!cancelled) Alert.alert("Error", e instanceof ApiError ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const onPdf = async () => {
    if (!inv) return;
    setPdfBusy(true);
    try {
      await shareClientInvoicePdf(inv.id, inv.reference);
    } catch (e) {
      Alert.alert("PDF failed", e instanceof Error ? e.message : String(e));
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!inv) {
    return (
      <View style={styles.center}>
        <Text>Invoice not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.ref}>{inv.reference ?? `#${inv.id}`}</Text>
      <Text style={styles.status}>{inv.status}</Text>

      <View style={styles.card}>
        <Row label="Amount" value={inv.amount != null ? `${inv.amount} ${inv.currency}` : "—"} />
        <Row label="Due" value={fmtDate(inv.due_date)} />
        {inv.paid_at ? <Row label="Paid" value={fmtDate(inv.paid_at)} /> : null}
        {inv.notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.notes}>{inv.notes}</Text>
          </View>
        ) : null}
      </View>

      <Pressable style={[styles.btn, pdfBusy && styles.disabled]} onPress={() => void onPdf()} disabled={pdfBusy}>
        <Text style={styles.btnText}>{pdfBusy ? "Preparing…" : "Download PDF"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, paddingBottom: 32 },
  ref: { fontSize: 22, fontWeight: "700" },
  status: { fontSize: 15, color: "#16a34a", marginTop: 4, textTransform: "capitalize" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  label: { color: "#6b7280", fontSize: 14 },
  value: { fontWeight: "600", fontSize: 14 },
  notes: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  btn: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  disabled: { opacity: 0.6 },
});
