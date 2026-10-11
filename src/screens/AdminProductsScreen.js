import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme/theme';
import { admin } from '../api';
import { Header } from '../components/FormBits';
import ProductImage from '../components/ProductImage';

const STATUS_LABEL = { ACTIVE: 'Đang bán', INACTIVE: 'Ẩn', DISCONTINUED: 'Ngừng bán' };

// Danh sach san pham de quan ly: tim, them, bam vao de sua / xoa.
export default function AdminProductsScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const load = useCallback(async (query) => {
    const id = ++reqId.current; // bo qua ket qua cu khi go nhanh
    setError(null);
    try {
      const r = await admin.listProducts({ q: query, size: 100 });
      if (id !== reqId.current) return;
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      if (id === reqId.current) setError(e.message || 'Không tải được danh sách.');
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Quay lai tu man hinh sua thi tai lai
  useFocusEffect(useCallback(() => { load(q); }, [load, q]));

  useEffect(() => { setLoading(true); }, [q]);

  function renderItem({ item }) {
    return (
      <Pressable style={styles.card} onPress={() => navigation.navigate('AdminProduct', { productId: item.id })}>
        <ProductImage url={item.image} width={160} compact style={styles.thumb} />
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.sub}>Mã {item.styleCode} · {item.variantCount} biến thể · Tồn {item.totalQuantity}</Text>
          <Text style={[styles.status, item.status !== 'ACTIVE' && styles.statusOff]}>{STATUS_LABEL[item.status] || item.status}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Header title="Quản lý sản phẩm" onBack={() => navigation.goBack()} />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Tìm theo tên hoặc mã mẫu"
          placeholderTextColor="#9AA2B1"
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => load(q)} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable>
        </View>
      ) : loading && items.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={colors.ink} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(q); }} />}
          ListHeaderComponent={total > 0 ? <Text style={styles.count}>{total} sản phẩm</Text> : null}
          ListEmptyComponent={<Text style={styles.empty}>{q ? 'Không có sản phẩm khớp.' : 'Chưa có sản phẩm nào. Bấm "Thêm sản phẩm".'}</Text>}
        />
      )}

      <View style={styles.footer}>
        <Pressable style={styles.addBtn} onPress={() => navigation.navigate('AdminProduct', {})}>
          <Text style={styles.addText}>+ Thêm sản phẩm</Text>
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
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  count: { fontSize: 12, color: colors.inkSoft, marginBottom: spacing.sm },
  card: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  thumb: { width: 64, height: 80, borderRadius: radius.sm, overflow: 'hidden' },
  body: { flex: 1, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 12, color: colors.inkSoft, marginTop: 3 },
  status: { fontSize: 12, fontWeight: '700', color: colors.accentDark, marginTop: 4 },
  statusOff: { color: colors.warn },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  retry: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.ink },
  retryText: { color: colors.white, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.inkSoft, marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, backgroundColor: colors.background },
  addBtn: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  addText: { fontSize: 15, fontWeight: '700', color: colors.ink },
});
