import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { apiListClientPromotions, formatPlanMoney, type ClientPromotion } from "@/lib/api";

export default function PromotionsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ClientPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await apiListClientPromotions());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Loading offers…" />;

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }}>
        <Text style={styles.subtitle}>Membership offers from your coach. Message them to sign up or renew.</Text>

        {items.length === 0 ? (
          <EmptyState icon="pricetag-outline" title="No offers right now" message="Check back later for membership deals." />
        ) : (
          items.map((p) => (
            <Card key={p.id} style={styles.card}>
              <Text style={styles.cardTitle}>{p.title}</Text>
              {p.body ? <Text style={styles.body}>{p.body}</Text> : null}
              {p.duration_days ? <Text style={styles.duration}>{p.duration_days}-day plan</Text> : null}
              <View style={styles.priceRow}>
                {p.discount_price != null ? (
                  <>
                    <Text style={styles.priceSale}>{formatPlanMoney(p.discount_price, p.currency)}</Text>
                    {p.price != null ? (
                      <Text style={styles.priceWas}>{formatPlanMoney(p.price, p.currency)}</Text>
                    ) : null}
                  </>
                ) : p.price != null ? (
                  <Text style={styles.priceSale}>{formatPlanMoney(p.price, p.currency)}</Text>
                ) : null}
                {p.savings_pct ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>-{p.savings_pct}%</Text>
                  </View>
                ) : null}
              </View>
              <Button label="Ask coach about this" variant="ghost" onPress={() => router.push("/(tabs)/messages")} />
            </Card>
          ))
        )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.bodySmall, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  cardTitle: { ...typography.subtitle, fontSize: 18, marginBottom: spacing.xs },
  body: { ...typography.bodySmall, marginBottom: spacing.xs },
  duration: { ...typography.caption, marginBottom: spacing.sm },
  priceRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  priceSale: { fontSize: 22, fontWeight: "700", color: colors.primary },
  priceWas: { fontSize: 15, color: colors.textMuted, textDecorationLine: "line-through" },
  badge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
});
