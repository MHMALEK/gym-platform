import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
  ApiError,
  apiListClientMessages,
  apiSendClientMessage,
  type ClientChatMessage,
} from "@/lib/api";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MessagesScreen() {
  const { me } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ClientChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await apiListClientMessages());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (items.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [items.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await apiSendClientMessage(text);
      setItems((prev) => [...prev, msg]);
      setInput("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingState label="Loading messages…" />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.banner}>
        <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
        <Text style={styles.bannerText}>Chat with {me?.coach_name ?? "your coach"}</Text>
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(m) => String(m.id)}
        style={styles.list}
        contentContainerStyle={[styles.listContent, items.length === 0 && styles.listEmpty]}
        ListEmptyComponent={
          <EmptyState icon="chatbubbles-outline" title="Start the conversation" message="Ask a question or send a progress update." />
        }
        renderItem={({ item }) => {
          const mine = item.sender_type === "client";
          return (
            <View style={[styles.bubbleWrap, mine ? styles.wrapMine : styles.wrapTheirs]}>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.body, mine && styles.bodyMine]}>{item.body}</Text>
              </View>
              <Text style={styles.meta}>{mine ? "You" : "Coach"} · {fmtTime(item.created_at)}</Text>
            </View>
          );
        }}
      />

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Write a message…"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
        />
        <Pressable
          style={[styles.sendBtn, (sending || !input.trim()) && styles.sendDisabled]}
          onPress={() => void send()}
          disabled={sending || !input.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bannerText: { ...typography.bodySmall, color: colors.primaryDark, fontWeight: "600" },
  err: { color: colors.danger, padding: spacing.md, fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.sm },
  listEmpty: { flexGrow: 1, justifyContent: "center" },
  bubbleWrap: { marginBottom: spacing.md, maxWidth: "85%" },
  wrapMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  wrapTheirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: 10 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: radii.sm },
  theirs: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomLeftRadius: radii.sm,
  },
  body: { fontSize: 15, lineHeight: 21, color: colors.text },
  bodyMine: { color: "#fff" },
  meta: { ...typography.caption, marginTop: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.45 },
});
