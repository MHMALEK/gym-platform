import { Pressable, StyleSheet, Text } from "react-native";

import { useAuth } from "@/contexts/AuthContext";

export function HeaderLogout() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={() => void signOut()} style={styles.btn} hitSlop={8}>
      <Text style={styles.label}>Log out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { marginRight: 12, paddingVertical: 4, paddingHorizontal: 4 },
  label: { fontSize: 16, color: "#2563eb", fontWeight: "500" },
});
