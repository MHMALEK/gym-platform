import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  ApiError,
  apiListClientMessages,
  apiSendClientMessage,
  type ClientChatMessage,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MessagesScreen() {
  const { me } = useAuth();
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}
    >
      <Text style={styles.sub}>Chat with {me?.coach_name ?? "your coach"}</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(m) => String(m.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hello!</Text>}
        renderItem={({ item }) => {
          const mine = item.sender_type === "client";
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={styles.meta}>
                {mine ? "You" : "Coach"} · {fmtTime(item.created_at)}
              </Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Write a message…"
          value={input}
          onChangeText={setInput}
        />
        <Pressable style={[styles.send, (sending || !input.trim()) && styles.disabled]} onPress={() => void send()} disabled={sending || !input.trim()}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sub: { paddingHorizontal: 16, paddingTop: 8, fontSize: 13, color: "#6b7280" },
  err: { color: "#b91c1c", padding: 12, fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 8 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40 },
  bubble: { maxWidth: "88%", borderRadius: 12, padding: 10, marginBottom: 10 },
  mine: { alignSelf: "flex-end", backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#86efac" },
  theirs: { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  meta: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  body: { fontSize: 15, lineHeight: 20, color: "#111827" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  send: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
