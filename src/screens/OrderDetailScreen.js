import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme/theme';
import { orders, PAY_LABEL, PAY_OPTIONS, STATUS_LABEL } from '../api';
import { parseMoney } from '../api/admin';
import { formatPrice } from '../utils/format';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Chips, Field, Header } from '../components/FormBits';
import Toast from '../components/Toast';
import { formatDateTime } from './OrdersScreen';

const group = (n) => (n ? formatPrice(n).replace('đ', '') : '');

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const { user } = useAuth();
  const can = (p) => !!user?.permissions?.includes(p);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(route.params?.toast || null);
  const [pay, setPay] = useState('UNPAID');
  const [paid, setPaid] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = useCallback((o) => {
    setOrder(o);
    setPay(o.paymentStatus);
    setPaid(o.paymentStatus === 'PARTIAL' ? String(o.paid) : '');
  }, []);

  useEffect(() => {
    let alive = true;
    orders.get(orderId).then((o) => { if (!alive) return; if (o.status === 'DRAFT') navigation.replace('OrderEdit', { orderId: o.id }); else apply(o); }).catch((e) => alive && setError(e.message || 'Không tải được đơn.'));
    return () => { alive = false; };
  }, [orderId, apply, navigation]);

  async function savePayment() {
    const amount = pay === 'PARTIAL' ? parseMoney(paid) : null;
    if (pay === 'PARTIAL' && (!amount || amount <= 0 || amount >= order.total)) {
      return Alert.alert('Chưa lưu được', 'Trả một phần: nhập số tiền đã trả, nhỏ hơn tổng đơn.');
    }
    setBusy(true);
    try {
      apply(await orders.updatePayment(order.id, { paymentStatus: pay, paidAmount: amount }));
      setToast('Đã cập nhật thanh toán');
    } catch (e) {
      Alert.alert('Không lưu được', e.message || 'Thử lại sau.');
    } finally {
      setBusy(false);
    }
  }

  function confirmCancel() {
    Alert.alert('Huỷ đơn', `Huỷ đơn ${order.code}? Hàng sẽ được trả lại kho.`, [
      { text: 'Giữ đơn', style: 'cancel' },
      {
        text: 'Huỷ đơn', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            apply(await orders.cancel(order.id));
            setToast('Đã huỷ đơn');
          } catch (e) {
            Alert.alert('Không huỷ được', e.message || 'Thử lại sau.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header title="Đơn hàng" onBack={() => navigation.goBack()} />
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }
  if (!order) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header title="Đơn hàng" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    );
  }

  const cancelled = order.status === 'CANCELLED';
  return (
    <SafeAreaView style={styles.screen}>
      <Header title={order.code} onBack={() => (route.params?.toast ? navigation.navigate('Home') : navigation.goBack())} />
      <Toast message={toast} onHide={() => setToast(null)} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.row}>
            <Text style={styles.meta}>{formatDateTime(order.orderedAt)} · {order.staffName}</Text>
            <Text style={[styles.status, cancelled && { color: colors.danger }]}>{STATUS_LABEL[order.status] || order.status}</Text>
          </View>
          {order.customerName || order.customerPhone ? (
            <Text style={styles.meta}>Khách: {[order.customerName, order.customerPhone].filter(Boolean).join(' · ')}</Text>
          ) : null}
          {order.note ? <Text style={styles.meta}>Ghi chú: {order.note}</Text> : null}
        </Card>

        <Card title="Sản phẩm">
          {order.items.map((i) => (
            <View key={i.variantId} style={styles.line}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{i.name}</Text>
                <Text style={styles.meta}>{[i.color, i.size].filter(Boolean).join(' · ')} · {i.quantity} × {formatPrice(i.unitPrice)}</Text>
              </View>
              <Text style={styles.lineTotal}>{formatPrice(i.lineTotal)}</Text>
            </View>
          ))}
          <View style={styles.sumRow}><Text style={styles.meta}>Tiền hàng</Text><Text style={styles.sum}>{formatPrice(order.subtotal)}</Text></View>
          {order.discount > 0 ? <View style={styles.sumRow}><Text style={styles.meta}>Giảm giá</Text><Text style={styles.sum}>-{formatPrice(order.discount)}</Text></View> : null}
          <View style={styles.sumRow}><Text style={styles.totalLabel}>Tổng cộng</Text><Text style={styles.total}>{formatPrice(order.total)}</Text></View>
          {order.profit !== null ? (
            <View style={styles.sumRow}>
              <Text style={styles.meta}>Lãi gộp đơn này</Text>
              <Text style={[styles.sum, { color: order.profit < 0 ? colors.danger : colors.accentDark }]}>{formatPrice(order.profit)}</Text>
            </View>
          ) : null}
        </Card>

        <Card title="Thanh toán" subtitle={`${PAY_LABEL[order.paymentStatus]} · đã trả ${formatPrice(order.paid)}${order.owed > 0 ? ` · còn thiếu ${formatPrice(order.owed)}` : ''}`}>
          {cancelled ? (
            <Text style={styles.meta}>Đơn đã huỷ nên không cập nhật thanh toán.</Text>
          ) : can('order.create') ? (
            <>
              <Chips options={PAY_OPTIONS} value={pay} onChange={setPay} />
              {pay === 'PARTIAL' ? (
                <Field label="Đã trả" keyboardType="number-pad" value={group(parseMoney(paid))} onChangeText={setPaid} placeholder="Số tiền khách đã trả" />
              ) : null}
              <Button title="Lưu thanh toán" onPress={savePayment} busy={busy} />
            </>
          ) : null}
        </Card>

        {!cancelled && can('order.cancel') ? (
          <Pressable onPress={confirmCancel} disabled={busy} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Huỷ đơn này</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  error: { color: colors.danger, textAlign: 'center', margin: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 13, color: colors.inkSoft, marginVertical: 2 },
  status: { fontSize: 13, fontWeight: '700', color: colors.accentDark },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  lineTotal: { fontSize: 14, fontWeight: '700', color: colors.ink, marginLeft: spacing.sm },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sum: { fontSize: 14, fontWeight: '600', color: colors.ink },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
  total: { fontSize: 18, fontWeight: '700', color: colors.accentDark },
  cancelBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm },
  cancelText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
