import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme/theme';
import { orders } from '../api';
import { formatPrice } from '../utils/format';
import { addItem, itemCount, itemFromSummary, stockMessage } from '../utils/draft';
import { useDraft } from '../utils/useDraft';
import { Header } from '../components/FormBits';
import ProductImage from '../components/ProductImage';
import Toast from '../components/Toast';

// Tim san pham theo ten / ma / SKU / ma vach de them vao don. Bam nhieu lan de them nhieu.
export default function OrderPickScreen({ navigation }) {
  const draft = useDraft();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const reqId = useRef(0);

  useEffect(() => {
    const text = q.trim();
    if (!text) {
      setRows([]);
      setError(null);
      return undefined;
    }
    const id = ++reqId.current; // bo qua ket qua cu khi go nhanh
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await orders.searchVariants(text);
        if (id !== reqId.current) return;
        setRows(r);
        setError(null);
      } catch (e) {
        if (id === reqId.current) setError(e.message || 'Không tìm được.');
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  function pick(s) {
    const r = addItem(itemFromSummary(s), 1);
    setToast(r.ok ? `Đã thêm ${s.name}` : null);
    if (!r.ok) setError(stockMessage(r));
    else setError(null);
  }

  const inCart = (id) => draft.items.find((i) => i.id === id)?.quantity || 0;

  return (
    <SafeAreaView style={styles.screen}>
      <Header title={`Thêm vào đơn tạm (${itemCount(draft.items)})`} onBack={() => navigation.goBack()} />
      <Toast message={toast} onHide={() => setToast(null)} />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Tên, mã mẫu, SKU hoặc mã vạch"
          placeholderTextColor="#9AA2B1"
          value={q}
          onChangeText={setQ}
          autoFocus
          autoCorrect={false}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.md }} /> : null}
      <FlatList
        data={rows}
        keyExtractor={(i) => String(i.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading && q.trim() ? <Text style={styles.empty}>Không có sản phẩm khớp.</Text> : null}
        renderItem={({ item }) => {
          const out = item.quantity <= 0;
          const n = inCart(item.id);
          return (
            <Pressable style={[styles.card, out && { opacity: 0.5 }]} onPress={() => pick(item)}>
              <ProductImage url={item.image} width={160} compact style={styles.thumb} />
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.sub}>{[item.color, item.size].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.sub}>{item.price ? formatPrice(item.price) : 'Chưa có giá'} · {out ? 'Hết hàng' : `Tồn ${item.quantity}`}</Text>
              </View>
              {n > 0 ? <Text style={styles.badge}>{n}</Text> : null}
            </Pressable>
          );
        }}
      />
      <View style={styles.footer}>
        <Pressable style={styles.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.doneText}>Xong</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  search: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.ink,
  },
  error: { color: colors.danger, paddingHorizontal: spacing.md, marginBottom: spacing.sm, fontSize: 13 },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  empty: { textAlign: 'center', color: colors.inkSoft, marginTop: spacing.xl },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  thumb: { width: 56, height: 70, borderRadius: radius.sm, overflow: 'hidden' },
  body: { flex: 1, paddingHorizontal: spacing.sm },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  badge: {
    minWidth: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, color: colors.ink, textAlign: 'center',
    lineHeight: 26, fontWeight: '700', overflow: 'hidden',
  },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, backgroundColor: colors.background },
  doneBtn: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  doneText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
