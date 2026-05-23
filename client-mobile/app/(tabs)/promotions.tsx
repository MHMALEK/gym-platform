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

import {
  apiListClientPromotions,
  formatPlanMoney,
  type ClientPromotion,
} from "@/lib/api";

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
    >
      <Text style={styles.title}>Promotions</Text>
      <Text style={styles.subtitle}>Membership offers from your coach. Message them to sign up or renew.</Text>

      {items.length === 0 ? (
        <Text style={styles.muted}>No promotions right now.</Text>
      ) : (
        items.map((p) => (
          <View key={p.id} style={styles.card}>
            <Text style={styles.cardTitle}>{p.title}</Text>
            {p.body ? <Text style={styles.body}>{p.body}</Text> : null}
            {p.duration_days ? (
              <Text style={styles.muted}>{p.duration_days}-day plan</Text>
            ) : null}
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
              {p.savings_pct ? <Text style={styles.badge}>-{p.savings_pct}%</Text> : null}
            </View>
            <Pressable onPress={() => router.push("/(tabs)/messages")}>
              <Text style={styles.link}>Ask coach about this plan →</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 16 },
  muted: { color: "#9ca3af", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 6 },
  body: { fontSize: 14, color: "#374151", marginBottom: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  priceSale: { fontSize: 18, fontWeight: "700", color: "#16a34a" },
  priceWas: { fontSize: 14, color: "#9ca3af", textDecorationLine: "line-through" },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  link: { color: "#16a34a", fontWeight: "600", marginTop: 10, fontSize: 15 },
});
