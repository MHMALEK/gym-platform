import { Stack } from "expo-router";

import { colors } from "@/constants/theme";

export default function PlansLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="log" options={{ title: "Log workout" }} />
      <Stack.Screen name="history" options={{ title: "Training log" }} />
      <Stack.Screen name="[sessionId]" options={{ title: "Session" }} />
    </Stack>
  );
}
