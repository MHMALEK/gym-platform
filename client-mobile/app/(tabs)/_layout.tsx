import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet } from "react-native";

import { LoadingState } from "@/components/ui/LoadingState";
import { colors, shadows } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

function TabIcon({ name, color, focused }: { name: keyof typeof Ionicons.glyphMap; color: string; focused: boolean }) {
  return <Ionicons name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)} size={24} color={color} />;
}

export default function TabLayout() {
  const { ready, token, signOut } = useAuth();

  if (!ready) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerRight: () => (
          <Pressable onPress={() => void signOut()} style={styles.signOut} hitSlop={12}>
            <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <TabIcon name="barbell" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <TabIcon name="receipt" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => <TabIcon name="chatbubbles" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen name="workout" options={{ href: null }} />
      <Tabs.Screen name="nutrition" options={{ href: null }} />
      <Tabs.Screen
        name="promotions"
        options={{
          href: null,
          title: "Offers",
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === "ios" ? 88 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    ...shadows.elevated,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  header: {
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontWeight: "700",
    fontSize: 17,
  },
  signOut: { marginRight: 16 },
});
