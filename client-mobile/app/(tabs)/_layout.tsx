import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";

function TabBarIcon(props: { name: React.ComponentProps<typeof FontAwesome>["name"]; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { ready, token, signOut } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: useClientOnlyValue(false, true),
        headerRight: () => (
          <Pressable onPress={() => void signOut()} style={{ marginRight: 16 }}>
            <FontAwesome name="sign-out" size={20} color={Colors[colorScheme ?? "light"].tint} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ color }) => <TabBarIcon name="heartbeat" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: "Nutrition",
          tabBarIcon: ({ color }) => <TabBarIcon name="cutlery" color={color} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="file-text-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{
          href: null,
          title: "Promotions",
        }}
      />
    </Tabs>
  );
}
