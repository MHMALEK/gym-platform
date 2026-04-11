import { Stack } from "expo-router";

import { HeaderLogout } from "@/components/HeaderLogout";

export default function InvoicesStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerRight: () => <HeaderLogout />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Invoices" }} />
      <Stack.Screen name="new" options={{ title: "New invoice" }} />
      <Stack.Screen name="[id]" options={{ title: "Invoice" }} />
      <Stack.Screen name="edit/[id]" options={{ title: "Edit invoice" }} />
    </Stack>
  );
}
