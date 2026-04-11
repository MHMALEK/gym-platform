import { Stack } from "expo-router";

import { HeaderLogout } from "@/components/HeaderLogout";

export default function ClientsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerRight: () => <HeaderLogout />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Clients" }} />
      <Stack.Screen name="new" options={{ title: "New client" }} />
      <Stack.Screen name="[id]" options={{ title: "Client" }} />
      <Stack.Screen name="edit/[id]" options={{ title: "Edit client" }} />
    </Stack>
  );
}
