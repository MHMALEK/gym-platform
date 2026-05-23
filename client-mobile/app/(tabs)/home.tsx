import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { HomeHero } from "@/components/home/HomeHero";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { QuickActionGrid, QuickActionTile } from "@/components/ui/QuickActionTile";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, reminderSeverityStyle, spacing, typography } from "@/constants/theme";
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
import { Badge } from "@/components/ui/Badge";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

  if (loading && !me) return <LoadingState label="Loading your dashboard…" />;
  if (!me) return <LoadingState label="Could not load profile" />;

  const openInv = invoices.filter((x) => x.status === "pending" || x.status === "overdue");
  const plan = me.coaching_plan;
  const hasWorkout =
    Boolean(plan?.workout_plan?.trim()) ||
    Boolean(plan?.workout_rich_html?.trim()) ||
    (plan?.workout_items?.length ?? 0) > 0;
  const hasDiet = Boolean(plan?.diet_plan?.trim()) || (plan?.diet_meals?.length ?? 0) > 0;

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }}>
      <HomeHero me={me} openInvoiceCount={openInv.length} reminderCount={reminders.length} />

      <QuickActionGrid>
        <QuickActionTile icon="barbell-outline" label="Log workout" subtitle="Track today's session" onPress={() => router.push("/(tabs)/plans/log")} />
        <QuickActionTile icon="restaurant-outline" label="Nutrition" subtitle={hasDiet ? "View meals" : "Not assigned"} onPress={() => router.push("/(tabs)/plans")} accent={colors.warningBg} />
        <QuickActionTile icon="chatbubble-ellipses-outline" label="Messages" subtitle="Chat with coach" onPress={() => router.push("/(tabs)/messages")} accent={colors.infoBg} />
        <QuickActionTile icon="receipt-outline" label="Invoices" subtitle={openInv.length ? `${openInv.length} open` : "All paid"} onPress={() => router.push("/(tabs)/invoices")} />
      </QuickActionGrid>

      {reminders.length > 0 ? (
        <Card style={styles.section}>
          <SectionHeader title="Reminders" icon="notifications-outline" actionLabel="See all" onAction={() => router.push("/(tabs)/invoices")} />
          {reminders.slice(0, 3).map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push(reminderRoute(r) as never)}
              style={[styles.reminderRow, reminderSeverityStyle(r.severity)]}
            >
              <Text style={styles.reminderTitle}>{r.title}</Text>
              <Text style={styles.reminderBody}>{r.body}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {promotions.length > 0 ? (
        <Card style={styles.section}>
          <SectionHeader title="Offers" icon="pricetag-outline" actionLabel="View all" onAction={() => router.push("/(tabs)/promotions")} />
          {promotions.slice(0, 2).map((p) => (
            <Pressable key={p.id} onPress={() => router.push("/(tabs)/promotions")} style={styles.promoRow}>
              <View style={styles.promoLeft}>
                <Text style={styles.promoTitle}>{p.title}</Text>
                {p.savings_pct ? <Badge label={`Save ${p.savings_pct}%`} tone="success" /> : null}
              </View>
              {p.discount_price != null ? (
                <Text style={styles.promoPrice}>{formatPlanMoney(p.discount_price, p.currency)}</Text>
              ) : null}
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Card style={styles.section}>
        <SectionHeader title="Recent invoices" icon="wallet-outline" actionLabel="All" onAction={() => router.push("/(tabs)/invoices")} />
        {invoices.length === 0 ? (
          <Text style={styles.muted}>No invoices yet.</Text>
        ) : (
          invoices.slice(0, 3).map((inv) => (
            <Pressable key={inv.id} onPress={() => router.push(`/(tabs)/invoices/${inv.id}`)} style={styles.invRow}>
              <View>
                <Text style={styles.invRef}>{inv.reference ?? `#${inv.id}`}</Text>
                <Text style={styles.invMeta}>Due {fmtDate(inv.due_date)}</Text>
              </View>
              <Badge label={inv.status} tone="invoice" status={inv.status} />
            </Pressable>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.md },
  reminderRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reminderTitle: { ...typography.subtitle, fontSize: 15 },
  reminderBody: { ...typography.caption, marginTop: 4, lineHeight: 18, color: colors.textSecondary },
  promoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  promoLeft: { flex: 1, gap: spacing.xs },
  promoTitle: { ...typography.subtitle, fontSize: 15 },
  promoPrice: { fontSize: 16, fontWeight: "700", color: colors.primary },
  invRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  invRef: { ...typography.subtitle, fontSize: 15 },
  invMeta: { ...typography.caption, marginTop: 2 },
  muted: { ...typography.bodySmall, color: colors.textMuted },
});
