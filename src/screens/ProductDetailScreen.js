import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { addItem, itemFromProduct, stockMessage } from '../utils/draft';
import { colors, type, spacing, radius } from '../theme/theme';
import { formatPrice, stockLabel } from '../utils/format';
import ProductImage from '../components/ProductImage';

const STOCK_COLORS = { ok: colors.accentDark, low: colors.warn, out: colors.danger };

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const canOrder = !!user?.permissions?.includes('order.create');
  const [addError, setAddError] = useState(null);
  const [page, setPage] = useState(0);
  const stock = stockLabel(product.quantity);
  const images = product.images?.length ? product.images : [null];

  const rows = [
    ...product.attributes.map((a) => ({ label: a.name, value: a.unit ? `${a.value} ${a.unit}` : a.value })),
    product.sku ? { label: 'Mã SKU', value: product.sku } : null,
    product.barcode ? { label: 'Mã vạch', value: product.barcode } : null,
    product.category ? { label: 'Danh mục', value: product.category } : null,
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <FlatList
          data={images}
          keyExtractor={(item, i) => `${i}-${item}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <ProductImage url={item} width={900} style={{ width, height: width * 1.1 }} />
          )}
        />
        {images.length > 1 ? (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
            ))}
          </View>
        ) : null}

        <View style={styles.body}>
          <Text style={type.display}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={type.price}>{formatPrice(product.price)}</Text>
            <Text style={[styles.stock, { color: STOCK_COLORS[stock.level] }]}>{stock.text}</Text>
          </View>
          {product.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Ghi chú</Text>
              <Text style={styles.noteText}>{product.note}</Text>
            </View>
          ) : null}
          {product.prices.length > 1 ? (
            <View style={styles.priceList}>
              {product.prices.map((p) => (
                <View key={`${p.type}-${p.minQty}`} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{p.label}</Text>
                  <Text style={styles.detailValue}>{formatPrice(p.price)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {product.description ? (
            <>
              <View style={styles.divider} />
              <Text style={type.h2}>Mô tả</Text>
              <Text style={[type.body, styles.description]}>{product.description}</Text>
            </>
          ) : null}

          {rows.length ? (
            <>
              <View style={styles.divider} />
              <Text style={type.h2}>Thông tin</Text>
              {rows.map((row) => (
                <View key={row.label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ))}
            </>
          ) : null}

          {product.siblings.length > 1 ? (
            <>
              <View style={styles.divider} />
              <Text style={type.h2}>Màu / size khác</Text>
              {product.siblings.map((v) => (
                <View key={v.id} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, v.isCurrent && styles.currentVariant]}>
                    {v.color} · {v.size}
                    {v.isCurrent ? '  (đang xem)' : ''}
                  </Text>
                  <Text style={[styles.detailValue, { color: STOCK_COLORS[stockLabel(v.quantity).level] }]}>
                    {stockLabel(v.quantity).text}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {canOrder ? (
          <Pressable
            style={styles.orderBtn}
            onPress={() => {
              const r = addItem(itemFromProduct(product), 1);
              if (r.ok) navigation.navigate('OrderEdit');
              else setAddError(stockMessage(r));
            }}
          >
            <Text style={styles.orderBtnText}>+ Thêm vào đơn tạm</Text>
          </Pressable>
        ) : null}
        {addError ? <Text style={styles.addError}>{addError}</Text> : null}
        <View style={styles.footerRow}>
        <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.secondaryBtnText}>Xong</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.replace('Scanner')}>
          <Text style={styles.primaryBtnText}>Quét tiếp</Text>
        </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginHorizontal: 3,
  },
  dotActive: { backgroundColor: colors.ink },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  stock: { fontSize: 15, fontWeight: '700' },
  noteBox: { marginTop: spacing.md, backgroundColor: colors.warnSoft, borderRadius: radius.sm, padding: spacing.md },
  noteLabel: { fontSize: 12, fontWeight: '700', color: colors.warn, marginBottom: 2 },
  noteText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  priceList: { marginTop: spacing.sm },
  currentVariant: { color: colors.ink, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  description: { marginTop: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { color: colors.inkSoft, fontSize: 14 },
  detailValue: { color: colors.ink, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  orderBtn: { paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center' },
  orderBtnText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  addError: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  secondaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.ink, fontWeight: '600', fontSize: 15 },
  primaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
