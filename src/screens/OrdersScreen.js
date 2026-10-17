import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme/theme';
import { orders, PAY_LABEL, STATUS_LABEL, STATUS_OPTIONS } from '../api';
import { formatPrice } from '../utils/format';
import { Chips, Header } from '../components/FormBits';

const PAY_COLOR = { UNPAID: colors.danger, PARTIAL: colors.warn, PAID: colors.accentDark };

export function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Danh sach don: nhan vien chi thay don minh tao, admin thay tat ca (BE loc).
export default function OrdersScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setError(null);
    try {
      const r = await orders.list({ q: q.trim(), status, size: 50 });
      if (id !== reqId.current) return;
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      if (id === reqId.current) setError(e.message || 'Không tải được danh sách đơn.');
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [q, status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.screen}>
      <Header title="Đơn hàng" onBack={() => navigation.goBack()} />
      <View style={styles.top}>
        <TextInput
          style={styles.search}
          placeholder="Mã đơn, tên hoặc SĐT khách"
          placeholderTextColor="#9AA2B1"
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
        />
        <Chips options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </View>
      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable>
        </View>
      ) : loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.ink} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={total > 0 ? <Text style={styles.count}>{total} đơn</Text> : null}
          ListEmptyComponent={<Text style={styles.empty}>{q || status ? 'Không có đơn khớp.' : 'Chưa có đơn nào.'}</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => (item.status === 'DRAFT' ? navigation.navigate('OrderEdit', { orderId: item.id }) : navigation.navigate('OrderDetail', { orderId: item.id }))}>
              <View style={styles.row}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.amount}>{formatPrice(item.total)}</Text>
              </View>
              <Text style={styles.sub}>
                {formatDateTime(item.orderedAt)} · {item.itemCount} món{item.customerName ? ` · ${item.customerName}` : ''} · {item.staffName}
              </Text>
              <View style={styles.row}>
                {item.status === 'DRAFT' ? (
                  <Text style={styles.draft}>{STATUS_LABEL.DRAFT}</Text>
                ) : (
                  <Text style={[styles.badge, { color: PAY_COLOR[item.paymentStatus] }]}>{PAY_LABEL[item.paymentStatus]}</Text>
                )}
                {item.status === 'CANCELLED' ? <Text style={styles.cancelled}>{STATUS_LABEL.CANCELLED}</Text> : null}
              </View>
            </Pressable>
          )}
        />
      )}
      <View style={styles.footer}>
        <Pressable style={styles.addBtn} onPress={() => navigation.navigate('OrderEdit')}>
          <Text style={styles.addText}>+ Tạo đơn mới</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: spacing.md },
  search: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.ink, marginBottom: spacing.sm,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  count: { fontSize: 12, color: colors.inkSoft, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 15, fontWeight: '700', color: colors.ink },
  amount: { fontSize: 15, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 12, color: colors.inkSoft, marginVertical: 4 },
  badge: { fontSize: 12, fontWeight: '700' },
  draft: { fontSize: 12, fontWeight: '700', color: colors.warn },
  cancelled: { fontSize: 12, fontWeight: '700', color: colors.danger },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  retry: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.ink },
  retryText: { color: colors.white, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.inkSoft, marginTop: spacing.xl },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, backgroundColor: colors.background },
  addBtn: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  addText: { fontSize: 15, fontWeight: '700', color: colors.ink },
});
