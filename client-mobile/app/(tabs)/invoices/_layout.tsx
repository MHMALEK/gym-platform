import { Stack } from "expo-router";

export default function InvoicesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Invoices" }} />
      <Stack.Screen name="[id]" options={{ title: "Invoice" }} />
    </Stack>
  );
}
