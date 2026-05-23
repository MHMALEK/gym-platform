import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NutritionPlanView } from "@/components/plans/NutritionPlanView";
import { WorkoutPlanView } from "@/components/plans/WorkoutPlanView";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "workout" | "nutrition";

export default function PlansScreen() {
  const { me } = useAuth();
  const [tab, setTab] = useState<Tab>("workout");
  const plan = me?.coaching_plan;

  return (
    <View style={styles.flex}>
      <View style={styles.segmentWrap}>
        <View style={styles.segment}>
          <Pressable
            style={[styles.segmentBtn, tab === "workout" && styles.segmentBtnActive]}
            onPress={() => setTab("workout")}
          >
            <Text style={[styles.segmentText, tab === "workout" && styles.segmentTextActive]}>Workout</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, tab === "nutrition" && styles.segmentBtnActive]}
            onPress={() => setTab("nutrition")}
          >
            <Text style={[styles.segmentText, tab === "nutrition" && styles.segmentTextActive]}>Nutrition</Text>
          </Pressable>
        </View>
      </View>
      {tab === "workout" ? <WorkoutPlanView plan={plan} /> : <NutritionPlanView plan={plan} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  segmentWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: radii.md,
    padding: spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: { ...typography.label, color: colors.textMuted },
  segmentTextActive: { color: colors.primaryDark },
});
