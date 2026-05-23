import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, spacing, typography } from "@/constants/theme";
import { ApiError, apiGetClientInvoice, formatPlanMoney, type ClientInvoice } from "@/lib/api";
import { shareClientInvoicePdf } from "@/lib/invoicePdf";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  if (loading) return <LoadingState label="Loading invoice…" />;

  if (!inv) {
    return (
      <Screen>
        <Text style={styles.notFound}>Invoice not found.</Text>
        <Button label="Back to invoices" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.ref}>{inv.reference ?? `#${inv.id}`}</Text>
        <Badge label={inv.status} tone="invoice" status={inv.status} />
      </View>

      <Card style={styles.card}>
        <DetailRow label="Amount" value={inv.amount != null ? formatPlanMoney(inv.amount, inv.currency) : "—"} highlight />
        <DetailRow label="Due date" value={fmtDate(inv.due_date)} />
        {inv.paid_at ? <DetailRow label="Paid on" value={fmtDate(inv.paid_at)} /> : null}
        {inv.notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notes}>{inv.notes}</Text>
          </View>
        ) : null}
      </Card>

      <Button label={pdfBusy ? "Preparing PDF…" : "Download PDF"} onPress={() => void onPdf()} loading={pdfBusy} />
    </Screen>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && styles.valueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  ref: { ...typography.title, flex: 1, marginRight: spacing.sm },
  card: { marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  label: { ...typography.bodySmall },
  value: { ...typography.subtitle, fontSize: 15 },
  valueHighlight: { color: colors.primary, fontSize: 18 },
  notesBlock: { marginTop: spacing.md, paddingTop: spacing.sm },
  notesLabel: { ...typography.label, marginBottom: spacing.xs },
  notes: { ...typography.body, color: colors.textSecondary },
  notFound: { ...typography.body, marginBottom: spacing.md, textAlign: "center" },
});
