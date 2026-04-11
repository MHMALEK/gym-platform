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
import { listClients, type ClientRow } from "@/lib/clients";

const PAGE = 40;

export default function ClientsListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { items, total: t } = await listClients({ limit: PAGE, offset: 0 });
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
          {total} client{total === 1 ? "" : "s"}
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
            onPress={() => router.push(`/(tabs)/clients/${item.id}`)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {[item.email, item.phone].filter(Boolean).join(" · ") || "—"}
            </Text>
            {item.status ? (
              <Text style={styles.badge}>{item.status}</Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={!error ? <Text style={styles.empty}>No clients yet.</Text> : null}
      />
      <Pressable style={styles.fab} onPress={() => router.push("/(tabs)/clients/new")}>
        <Text style={styles.fabText}>+ New client</Text>
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
  name: { fontSize: 17, fontWeight: "600", color: "#111827" },
  sub: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  badge: { marginTop: 6, fontSize: 12, color: "#2563eb", fontWeight: "500" },
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
