import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import {
  apiListClientInvoices,
  apiListClientPromotions,
  apiListClientReminders,
  formatPlanMoney,
  reminderRoute,
  type ClientInvoice,
  type ClientPromotion,
  type ClientReminder,
} from "@/lib/api";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

export default function HomeScreen() {
  const router = useRouter();
  const { me, refreshMe } = useAuth();
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [reminders, setReminders] = useState<ClientReminder[]>([]);
  const [promotions, setPromotions] = useState<ClientPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      await refreshMe();
      const [inv, rem, prom] = await Promise.all([
        apiListClientInvoices(),
        apiListClientReminders(),
        apiListClientPromotions(),
      ]);
      setInvoices(inv);
      setReminders(rem);
      setPromotions(prom);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshMe]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  if (loading && !me) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const plan = me?.coaching_plan;
  const hasWorkout =
    Boolean(plan?.workout_plan?.trim()) ||
    Boolean(plan?.workout_rich_html?.trim()) ||
    (plan?.workout_items?.length ?? 0) > 0;
  const hasDiet = Boolean(plan?.diet_plan?.trim()) || (plan?.diet_meals?.length ?? 0) > 0;
  const openInv = invoices.filter((x) => x.status === "pending" || x.status === "overdue");

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>Hi, {me?.name ?? "there"}</Text>
      <Text style={styles.coach}>Coach: {me?.coach_name ?? "—"}</Text>
      {me?.coach_tagline ? <Text style={styles.tagline}>{me.coach_tagline}</Text> : null}

      {reminders.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reminders</Text>
          {reminders.slice(0, 4).map((r) => (
            <Pressable key={r.id} onPress={() => router.push(reminderRoute(r) as never)} style={styles.reminderRow}>
              <Text style={[styles.reminderTitle, r.severity === "high" && styles.reminderHigh]}>{r.title}</Text>
              <Text style={styles.muted}>{r.body}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {promotions.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Promotions</Text>
          {promotions.slice(0, 2).map((p) => (
            <Pressable key={p.id} onPress={() => router.push("/(tabs)/promotions")} style={styles.promoRow}>
              <Text style={styles.promoTitle}>{p.title}</Text>
              {p.discount_price != null ? (
                <Text style={styles.promoPrice}>{formatPlanMoney(p.discount_price, p.currency)}</Text>
              ) : p.price != null ? (
                <Text style={styles.promoPrice}>{formatPlanMoney(p.price, p.currency)}</Text>
              ) : null}
            </Pressable>
          ))}
          <Pressable onPress={() => router.push("/(tabs)/promotions")}>
            <Text style={styles.link}>All promotions →</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your plan</Text>
        {!hasWorkout && !hasDiet ? (
          <Text style={styles.muted}>No workout or nutrition plan assigned yet.</Text>
        ) : (
          <>
            {hasWorkout ? (
              <Pressable onPress={() => router.push("/(tabs)/workout")}>
                <Text style={styles.link}>View workout →</Text>
              </Pressable>
            ) : null}
            {hasDiet ? (
              <Pressable onPress={() => router.push("/(tabs)/nutrition")}>
                <Text style={styles.link}>View nutrition →</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Invoices</Text>
        {openInv.length > 0 ? (
          <Text style={styles.warn}>{openInv.length} need attention</Text>
        ) : null}
        {invoices.length === 0 ? (
          <Text style={styles.muted}>No invoices yet.</Text>
        ) : (
          invoices.slice(0, 3).map((inv) => (
            <Pressable key={inv.id} onPress={() => router.push(`/(tabs)/invoices/${inv.id}`)}>
              <Text style={styles.invRow}>
                {inv.reference ?? `#${inv.id}`} · {inv.status} · due {fmtDate(inv.due_date)}
              </Text>
            </Pressable>
          ))
        )}
        <Pressable onPress={() => router.push("/(tabs)/invoices")}>
          <Text style={styles.link}>All invoices →</Text>
        </Pressable>
      </View>

      <Pressable style={styles.card} onPress={() => router.push("/(tabs)/messages")}>
        <Text style={styles.cardTitle}>Messages</Text>
        <Text style={styles.link}>Chat with your coach →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  coach: { fontSize: 16, color: "#374151" },
  tagline: { fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 8 },
  muted: { color: "#9ca3af", fontSize: 14 },
  link: { color: "#16a34a", fontWeight: "600", marginTop: 6, fontSize: 15 },
  warn: { color: "#b45309", marginBottom: 6, fontSize: 14 },
  invRow: { fontSize: 14, color: "#374151", paddingVertical: 4 },
  reminderRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  reminderTitle: { fontSize: 14, fontWeight: "600", color: "#374151" },
  reminderHigh: { color: "#b91c1c" },
  promoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  promoTitle: { fontSize: 14, fontWeight: "600", flex: 1, marginRight: 8 },
  promoPrice: { fontSize: 14, fontWeight: "700", color: "#16a34a" },
});
