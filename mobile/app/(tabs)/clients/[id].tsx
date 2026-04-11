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
import { getClient, deleteClient, type ClientRow } from "@/lib/clients";
import { listInvoices, type InvoiceRow } from "@/lib/invoices";

export default function ClientDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const id = Number(idParam);
  const [c, setC] = useState<ClientRow | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setErr(null);
    try {
      const client = await getClient(id);
      setC(client);
      const inv = await listInvoices({ limit: 10, offset: 0 }, { client_id: id });
      setInvoices(inv.items);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = () => {
    Alert.alert("Delete client", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteClient(id);
              router.replace("/(tabs)/clients");
            } catch (e) {
              Alert.alert("Error", e instanceof ApiError ? e.message : String(e));
            }
          })();
        },
      },
    ]);
  };

  if (loading || !c) {
    return (
      <View style={styles.center}>
        {err ? <Text style={styles.err}>{err}</Text> : <ActivityIndicator size="large" />}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>{c.name}</Text>
      <Text style={styles.line}>{c.email || "—"}</Text>
      <Text style={styles.line}>{c.phone || "—"}</Text>
      <Text style={styles.meta}>
        Status: {c.status ?? "—"} · Account: {c.account_status ?? "—"}
      </Text>
      {c.notes ? <Text style={styles.notes}>{c.notes}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={() => router.push(`/(tabs)/clients/edit/${id}`)}>
          <Text style={styles.btnText}>Edit</Text>
        </Pressable>
        <Pressable
          style={styles.btn}
          onPress={() =>
            router.push({ pathname: "/(tabs)/invoices/new", params: { client_id: String(id) } })
          }
        >
          <Text style={styles.btnText}>New invoice</Text>
        </Pressable>
        <Pressable style={styles.btnDanger} onPress={onDelete}>
          <Text style={styles.btnDangerText}>Delete</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Recent invoices</Text>
      {invoices.length === 0 ? (
        <Text style={styles.muted}>No invoices for this client.</Text>
      ) : (
        invoices.map((inv) => (
          <Pressable
            key={inv.id}
            style={styles.invRow}
            onPress={() => router.push(`/(tabs)/invoices/${inv.id}`)}
          >
            <Text style={styles.invRef}>{inv.reference || `#${inv.id}`}</Text>
            <Text style={styles.invAmt}>
              {inv.amount != null ? `${inv.amount} ${inv.currency}` : "—"} · {inv.status}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  err: { color: "#b91c1c", textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  line: { fontSize: 16, color: "#374151", marginBottom: 4 },
  meta: { fontSize: 14, color: "#6b7280", marginTop: 8 },
  notes: { marginTop: 16, fontSize: 15, color: "#111827", lineHeight: 22 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 24, marginBottom: 8 },
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
  section: { fontSize: 18, fontWeight: "700", marginTop: 24, marginBottom: 12 },
  muted: { color: "#9ca3af" },
  invRow: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  invRef: { fontSize: 16, fontWeight: "600" },
  invAmt: { fontSize: 14, color: "#6b7280", marginTop: 4 },
});
