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

import { ApiError, apiListClientInvoices, type ClientInvoice } from "@/lib/api";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
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

  if (loading && rows.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(tabs)/invoices/${item.id}`)}>
            <Text style={styles.ref}>{item.reference || `#${item.id}`}</Text>
            <Text style={styles.sub}>
              {item.amount != null ? `${item.amount} ${item.currency}` : "—"} · Due {fmtDate(item.due_date)}
            </Text>
            <Text style={styles.status}>{item.status}</Text>
          </Pressable>
        )}
        ListEmptyComponent={!error ? <Text style={styles.empty}>No invoices yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  err: { color: "#b91c1c", padding: 16 },
  row: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  ref: { fontSize: 17, fontWeight: "600", color: "#111827" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  status: { fontSize: 13, color: "#16a34a", marginTop: 4, fontWeight: "600", textTransform: "capitalize" },
  empty: { textAlign: "center", marginTop: 48, color: "#9ca3af" },
});
