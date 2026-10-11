import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, type, spacing, radius } from '../theme/theme';
import { api } from '../api';
import { addToHistory } from '../utils/history';
import { formatPrice, stockLabel } from '../utils/format';
import ProductImage from '../components/ProductImage';

// Ket qua quet anh khi chua chac chan: nhan vien chon dung san pham.
export default function CandidatesScreen({ route, navigation }) {
  const { candidates = [], scanEventId } = route.params || {};
  const [openingId, setOpeningId] = useState(null);
  const [error, setError] = useState(null);

  async function choose(item) {
    if (openingId) return;
    setOpeningId(item.variant.id);
    setError(null);
    try {
      const product = await api.getVariant(item.variant.id);
      if (!product) throw new Error('Không tải được sản phẩm.');
      api.confirmScan(scanEventId, item.variant.id); // khong cho ket qua
      await addToHistory(product);
      navigation.replace('ProductDetail', { product });
    } catch (e) {
      setError(e.message || 'Không mở được sản phẩm. Thử lại.');
      setOpeningId(null);
    }
  }

  function renderItem({ item }) {
    const v = item.variant;
    const stock = stockLabel(v.quantity);
    const variantText = [v.color, v.size].filter(Boolean).join(' · ');
    return (
      <Pressable style={styles.card} onPress={() => choose(item)} disabled={!!openingId}>
        <ProductImage url={v.image} width={200} compact style={styles.thumb} />
        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={2}>{v.name}</Text>
          {variantText ? <Text style={styles.sub}>{variantText}</Text> : null}
          <View style={styles.row}>
            {v.price != null ? <Text style={styles.price}>{formatPrice(v.price)}</Text> : null}
            <Text style={[styles.stock, stock.level === 'out' && styles.stockOut]}>{stock.text}</Text>
          </View>
        </View>
        <View style={styles.right}>
          {openingId === v.id ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={styles.score}>{Math.round(item.score * 100)}%</Text>
          )}
          <Text style={styles.scoreLabel}>giống</Text>
        </View>
      </Pressable>
    );
  }

  const empty = candidates.length === 0;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={type.h1}>{empty ? 'Chưa nhận ra sản phẩm' : 'Có phải sản phẩm này?'}</Text>
        <Text style={[type.body, styles.headerSub]}>
          {empty
            ? 'Thử chụp lại gần hơn, đủ sáng, nền gọn. Hoặc quét mã vạch trên tem.'
            : 'Chọn sản phẩm đúng. Kết quả chỉ là gợi ý theo hình dáng.'}
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={candidates}
        keyExtractor={(c) => String(c.variant.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />

      <View style={styles.footer}>
        <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.secondaryBtnText}>Về trang chủ</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.replace('Scanner')}>
          <Text style={styles.primaryBtnText}>Quét lại</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  headerSub: { marginTop: spacing.xs },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 72, height: 88, borderRadius: radius.sm, overflow: 'hidden' },
  cardBody: { flex: 1, paddingHorizontal: spacing.sm },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  price: { fontSize: 14, fontWeight: '700', color: colors.accentDark, marginRight: spacing.sm },
  stock: { fontSize: 12, color: colors.inkSoft },
  stockOut: { color: colors.danger },
  right: { alignItems: 'center', minWidth: 52 },
  score: { fontSize: 18, fontWeight: '700', color: colors.ink },
  scoreLabel: { fontSize: 11, color: colors.inkSoft },
  error: { color: colors.danger, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, fontSize: 14 },
  footer: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  secondaryBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  secondaryBtnText: { color: colors.ink, fontWeight: '600', fontSize: 15 },
  primaryBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: colors.accent },
  primaryBtnText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
});
