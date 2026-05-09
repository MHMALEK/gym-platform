import { Stack } from "expo-router";

import { HeaderLogout } from "@/components/HeaderLogout";

export default function PlannerStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerRight: () => <HeaderLogout />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Planner" }} />
      <Stack.Screen name="[id]" options={{ title: "Training plan" }} />
      <Stack.Screen name="assign" options={{ title: "Assign plan" }} />
    </Stack>
  );
}
