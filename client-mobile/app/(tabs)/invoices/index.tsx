import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors, spacing, typography } from "@/constants/theme";
import { ApiError, apiListClientInvoices, formatPlanMoney, type ClientInvoice } from "@/lib/api";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "No due date";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function InvoicesListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await apiListClientInvoices());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && rows.length === 0) return <LoadingState label="Loading invoices…" />;

  return (
    <View style={styles.flex}>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !error ? <EmptyState icon="receipt-outline" title="No invoices" message="When your coach sends a bill, it will appear here." /> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push(`/(tabs)/invoices/${item.id}`)}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.ref}>{item.reference || `#${item.id}`}</Text>
              <Text style={styles.sub}>
                {item.amount != null ? formatPlanMoney(item.amount, item.currency) : "—"} · Due {fmtDate(item.due_date)}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Badge label={item.status} tone="invoice" status={item.status} />
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  err: { color: colors.danger, padding: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowPressed: { opacity: 0.92 },
  rowLeft: { flex: 1 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ref: { ...typography.subtitle, fontSize: 16 },
  sub: { ...typography.caption, marginTop: 4, color: colors.textSecondary },
});
