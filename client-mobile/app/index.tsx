import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { ready, token } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }
  if (!token) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)/home" />;
}
