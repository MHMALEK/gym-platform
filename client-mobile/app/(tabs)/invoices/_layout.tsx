import { Stack } from "expo-router";

import { colors } from "@/constants/theme";

export default function InvoicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700" },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Invoices" }} />
      <Stack.Screen name="[id]" options={{ title: "Invoice details" }} />
    </Stack>
  );
}
