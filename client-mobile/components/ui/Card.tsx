import { Pressable, StyleSheet, View, type ViewProps } from "react-native";

import { colors, radii, shadows, spacing } from "@/constants/theme";

type Props = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
  elevated?: boolean;
};

export function Card({ onPress, padded = true, elevated = true, style, children, ...rest }: Props) {
  const content = (
    <View
      style={[
        styles.card,
        elevated && shadows.card,
        padded && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  padded: { padding: spacing.md },
  pressed: { opacity: 0.92 },
});
