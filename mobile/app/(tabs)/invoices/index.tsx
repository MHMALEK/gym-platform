import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "@/lib/api";
import { listInvoices, type InvoiceRow } from "@/lib/invoices";

const PAGE = 40;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

export default function InvoicesListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { items, total: t } = await listInvoices({ limit: PAGE, offset: 0 });
      setRows(items);
      setTotal(t);
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

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  if (loading && rows.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <Text style={styles.meta}>
          {total} invoice{total === 1 ? "" : "s"}
        </Text>
      )}
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 88 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/(tabs)/invoices/${item.id}`)}
          >
            <Text style={styles.ref}>{item.reference || `#${item.id}`}</Text>
            <Text style={styles.client}>{item.client?.name ?? "—"}</Text>
            <Text style={styles.sub}>
              {item.amount != null ? `${item.amount} ${item.currency}` : "—"} · Due {fmtDate(item.due_date)} ·{" "}
              {item.status}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={!error ? <Text style={styles.empty}>No invoices yet.</Text> : null}
      />
      <Pressable style={styles.fab} onPress={() => router.push("/(tabs)/invoices/new")}>
        <Text style={styles.fabText}>+ New invoice</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  meta: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, color: "#6b7280" },
  err: { color: "#b91c1c", padding: 16 },
  row: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  ref: { fontSize: 17, fontWeight: "600", color: "#111827" },
  client: { fontSize: 15, color: "#374151", marginTop: 4 },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 48, color: "#9ca3af" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
