import { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants/theme";

type Props = ScrollViewProps & {
  children: ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
  refreshing?: boolean;
  onRefresh?: () => void;
  noPadding?: boolean;
  safe?: boolean;
};

export function Screen({
  children,
  edges = ["bottom"],
  refreshing,
  onRefresh,
  noPadding,
  safe = true,
  contentContainerStyle,
  ...scrollProps
}: Props) {
  const inner = (
    <ScrollView
      contentContainerStyle={[
        !noPadding && styles.scroll,
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  );

  if (!safe) {
    return <View style={styles.flex}>{inner}</View>;
  }

  return (
    <SafeAreaView style={styles.flex} edges={edges}>
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
