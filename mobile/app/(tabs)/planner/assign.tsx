import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "@/lib/api";
import {
  assignTrainingPlanToClient,
  listPlannerClients,
  listTrainingPlans,
  type TrainingPlanSummary,
} from "@/lib/planner";
import type { ClientRow } from "@/lib/clients";

const MAX_PAGE_SIZE = 200;

export default function PlannerAssignScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ client_id?: string; training_plan_id?: string }>();
  const presetClientId = params.client_id ? Number(params.client_id) : null;
  const presetPlanId = params.training_plan_id ? Number(params.training_plan_id) : null;

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [plans, setPlans] = useState<TrainingPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(presetClientId);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(presetPlanId);

  const load = useCallback(async () => {
    try {
      const [clientRes, planRes] = await Promise.all([
        listPlannerClients({ limit: MAX_PAGE_SIZE, offset: 0 }),
        listTrainingPlans({ limit: MAX_PAGE_SIZE, offset: 0 }),
      ]);
      setClients(clientRes.items);
      setPlans(planRes.items);
    } catch (e) {
      Alert.alert("Could not load planner data", e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedClientName = useMemo(
    () => clients.find((c) => c.id === selectedClientId)?.name ?? "Select client",
    [clients, selectedClientId],
  );
  const selectedPlanName = useMemo(
    () => plans.find((p) => p.id === selectedPlanId)?.name ?? "Select training plan",
    [plans, selectedPlanId],
  );

  const onAssign = async () => {
    if (selectedClientId == null) {
      Alert.alert("Validation", "Please choose a client.");
      return;
    }
    if (selectedPlanId == null) {
      Alert.alert("Validation", "Please choose a training plan.");
      return;
    }

    setBusy(true);
    try {
      await assignTrainingPlanToClient(selectedClientId, selectedPlanId);
      Alert.alert("Assigned", "Training plan assigned successfully.", [
        {
          text: "OK",
          onPress: () => router.push(`/(tabs)/clients/${selectedClientId}`),
        },
      ]);
    } catch (e) {
      Alert.alert("Assignment failed", e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.label}>Client *</Text>
      <Pressable style={styles.input} onPress={() => setClientPickerOpen(true)}>
        <Text style={styles.inputText}>{selectedClientName}</Text>
      </Pressable>

      <Text style={styles.label}>Training plan *</Text>
      <Pressable style={styles.input} onPress={() => setPlanPickerOpen(true)}>
        <Text style={styles.inputText}>{selectedPlanName}</Text>
      </Pressable>

      <Pressable style={[styles.primary, busy && styles.disabled]} onPress={() => void onAssign()} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Assign plan</Text>}
      </Pressable>

      <Modal visible={clientPickerOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose client</Text>
            <FlatList
              data={clients}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalRow}
                  onPress={() => {
                    setSelectedClientId(item.id);
                    setClientPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{item.name}</Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.modalClose} onPress={() => setClientPickerOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={planPickerOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose training plan</Text>
            <FlatList
              data={plans}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalRow}
                  onPress={() => {
                    setSelectedPlanId(item.id);
                    setPlanPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{item.name}</Text>
                  <Text style={styles.modalHint}>Venue: {item.venue_type}</Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.modalClose} onPress={() => setPlanPickerOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, paddingBottom: 40, backgroundColor: "#fff", flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    justifyContent: "center",
  },
  inputText: { fontSize: 16, color: "#111827" },
  primary: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.6 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    maxHeight: "70%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", paddingHorizontal: 16, marginBottom: 8 },
  modalRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  modalRowText: { fontSize: 16, color: "#111827" },
  modalHint: { fontSize: 13, color: "#6b7280", marginTop: 2, textTransform: "capitalize" },
  modalClose: { padding: 16, alignItems: "center" },
  modalCloseText: { fontSize: 16, color: "#2563eb", fontWeight: "600" },
});
