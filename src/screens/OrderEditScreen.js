import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme/theme';
import { orders, PAY_OPTIONS, orderTotals, validateOrder, buildOrderRequest } from '../api';
import { parseMoney } from '../api/admin';
import { formatPrice } from '../utils/format';
import { addItem, clearDraft, getDraft, loadFromOrder, removeItem, setForm, setPrice, setQuantity, stockMessage, itemCount } from '../utils/draft';
import { useDraft } from '../utils/useDraft';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Chips, Field, Header } from '../components/FormBits';
import Toast from '../components/Toast';

const group = (n) => (n ? formatPrice(n).replace('đ', '') : '');

// Soan don tam: them san pham (quet / tim), thanh toan nhap tay, khach. "Luu don tam" giu lai tren may chu
// (khong tru kho); "Chot don" moi tru kho va doi thanh don that.
export default function OrderEditScreen({ navigation, route }) {
  const draft = useDraft();
  const { user } = useAuth();
  const canPrice = !!user?.permissions?.includes('order.price');
  const orderId = route.params?.orderId;
  const [loading, setLoading] = useState(!!orderId && draft.orderId !== orderId);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const skipGuard = useRef(false);

  const { items, form } = draft;
  const { subtotal, discount, total } = orderTotals(items, form);

  // Mo don tam da luu tu danh sach
  useEffect(() => {
    if (!orderId || getDraft().orderId === orderId) return undefined;
    let alive = true;
    setLoading(true);
    orders.get(orderId)
      .then((o) => {
        if (!alive) return;
        if (o.status !== 'DRAFT') navigation.replace('OrderDetail', { orderId: o.id });
        else loadFromOrder(o);
      })
      .catch((e) => alive && setLoadError(e.message || 'Không tải được đơn tạm.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [orderId, navigation]);

  // Roi man hinh ma khong con thay doi chua luu thi don dep don tam, de lan "Tao don" sau bat dau moi
  useEffect(() => () => { if (!getDraft().dirty) clearDraft(); }, []);

  async function persist(confirm) {
    const d = getDraft();
    const problem = validateOrder(d.items, d.form, { confirm });
    if (problem) {
      Alert.alert(confirm ? 'Chưa chốt được đơn' : 'Chưa lưu được', problem);
      return null;
    }
    setBusy(true);
    try {
      const payload = buildOrderRequest(d.items, d.form, { canPrice, confirm });
      return d.orderId ? await orders.save(d.orderId, payload) : await orders.create(payload);
    } catch (e) {
      Alert.alert(confirm ? 'Không chốt được đơn' : 'Không lưu được', e.message || 'Thử lại sau.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    const order = await persist(false);
    if (!order) return false;
    loadFromOrder(order);
    setToast(`Đã lưu ${order.code}`);
    return true;
  }

  function confirmOrder() {
    Alert.alert('Chốt đơn', `Chốt đơn ${formatPrice(total)}? Kho sẽ được trừ ngay.`, [
      { text: 'Chưa', style: 'cancel' },
      {
        text: 'Chốt đơn',
        onPress: async () => {
          const order = await persist(true);
          if (!order) return;
          clearDraft();
          skipGuard.current = true;
          navigation.replace('OrderDetail', { orderId: order.id, toast: `Đã chốt đơn ${order.code}` });
        },
      },
    ]);
  }

  function discard() {
    const saved = !!getDraft().orderId;
    Alert.alert(saved ? 'Xoá đơn tạm' : 'Bỏ đơn', saved ? 'Xoá hẳn đơn tạm này?' : 'Bỏ đơn đang soạn?', [
      { text: 'Giữ lại', style: 'cancel' },
      {
        text: saved ? 'Xoá' : 'Bỏ', style: 'destructive',
        onPress: async () => {
          if (saved) {
            setBusy(true);
            try {
              await orders.remove(getDraft().orderId);
            } catch (e) {
              setBusy(false);
              return Alert.alert('Không xoá được', e.message || 'Thử lại sau.');
            }
            setBusy(false);
          }
          clearDraft();
          skipGuard.current = true;
          navigation.goBack();
        },
      },
    ]);
  }

  // Thoat khi con thay doi chua luu: hoi truoc
  const saveRef = useRef(saveDraft);
  saveRef.current = saveDraft;
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (skipGuard.current || !getDraft().dirty) return;
        e.preventDefault();
        Alert.alert('Đơn chưa lưu', 'Lưu thành đơn tạm để làm tiếp sau?', [
          { text: 'Ở lại', style: 'cancel' },
          {
            text: 'Bỏ thay đổi', style: 'destructive',
            onPress: () => { clearDraft(); skipGuard.current = true; navigation.dispatch(e.data.action); },
          },
          {
            text: 'Lưu đơn tạm',
            onPress: async () => { if (await saveRef.current()) { skipGuard.current = true; navigation.dispatch(e.data.action); } },
          },
        ]);
      }),
    [navigation]
  );

  function plus(item) {
    const r = addItem(item, 1);
    if (!r.ok) Alert.alert('Không thêm được', stockMessage(r));
  }

  if (loading || loadError) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header title="Đơn tạm" onBack={() => navigation.goBack()} />
        {loadError ? <Text style={styles.error}>{loadError}</Text> : <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Header title={draft.code || 'Đơn mới'} onBack={() => navigation.goBack()} right={<Text style={styles.pill}>Đơn tạm</Text>} />
      <Toast message={toast} onHide={() => setToast(null)} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card title="Sản phẩm" subtitle={items.length ? `${itemCount(items)} món` : undefined}>
            {items.length === 0 ? <Text style={styles.empty}>Chưa có sản phẩm. Quét mã hoặc tìm để thêm vào đơn.</Text> : null}
            {items.map((i) => (
              <View key={i.id} style={styles.line}>
                <View style={styles.lineTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={2}>{i.name}</Text>
                    <Text style={styles.sub}>{[i.color, i.size].filter(Boolean).join(' · ')} · Tồn {i.stock}</Text>
                  </View>
                  <Pressable onPress={() => removeItem(i.id)} hitSlop={10}><Text style={styles.remove}>✕</Text></Pressable>
                </View>
                <View style={styles.lineBottom}>
                  <View style={styles.stepper}>
                    <Pressable style={styles.stepBtn} onPress={() => (i.quantity > 1 ? setQuantity(i.id, i.quantity - 1) : removeItem(i.id))}>
                      <Text style={styles.stepText}>−</Text>
                    </Pressable>
                    <Text style={styles.qty}>{i.quantity}</Text>
                    <Pressable style={styles.stepBtn} onPress={() => plus(i)}><Text style={styles.stepText}>+</Text></Pressable>
                  </View>
                  {canPrice ? (
                    <View style={styles.priceBox}>
                      <Field
                        label="Giá bán"
                        style={{ marginBottom: 0 }}
                        keyboardType="number-pad"
                        value={group(i.price)}
                        placeholder="Nhập giá"
                        onChangeText={(t) => setPrice(i.id, parseMoney(t))}
                      />
                    </View>
                  ) : (
                    <Text style={[styles.unitPrice, i.price === null && { color: colors.danger }]}>
                      {i.price === null ? 'Chưa có giá' : `${formatPrice(i.price)} / cái`}
                    </Text>
                  )}
                  <Text style={styles.lineTotal}>{formatPrice((i.price || 0) * i.quantity)}</Text>
                </View>
              </View>
            ))}
            <View style={styles.addRow}>
              <Pressable style={styles.addBtn} onPress={() => navigation.navigate('OrderPick')}>
                <Text style={styles.addText}>+ Tìm sản phẩm</Text>
              </Pressable>
              <Pressable style={styles.addBtn} onPress={() => navigation.navigate('Scanner')}>
                <Text style={styles.addText}>Quét để thêm</Text>
              </Pressable>
            </View>
          </Card>

          <Card title="Thanh toán" subtitle="Nhập tay, chưa nối cổng thanh toán">
            <Chips options={PAY_OPTIONS} value={form.paymentStatus} onChange={(v) => setForm({ paymentStatus: v })} />
            {form.paymentStatus === 'PARTIAL' ? (
              <Field label="Đã trả" keyboardType="number-pad" value={group(parseMoney(form.paid))} onChangeText={(t) => setForm({ paid: t })} placeholder="Số tiền khách đã trả" />
            ) : null}
            <Field label="Giảm giá (cả đơn)" keyboardType="number-pad" value={group(parseMoney(form.discount))} onChangeText={(t) => setForm({ discount: t })} placeholder="0" />
            <View style={styles.sumRow}><Text style={styles.sumLabel}>Tiền hàng</Text><Text style={styles.sumValue}>{formatPrice(subtotal)}</Text></View>
            {discount > 0 ? <View style={styles.sumRow}><Text style={styles.sumLabel}>Giảm giá</Text><Text style={styles.sumValue}>-{formatPrice(discount)}</Text></View> : null}
            <View style={styles.sumRow}><Text style={styles.totalLabel}>Tổng cộng</Text><Text style={styles.totalValue}>{formatPrice(total)}</Text></View>
          </Card>

          <Card title="Khách hàng" subtitle="Không bắt buộc">
            <Field label="Tên khách" value={form.customerName} onChangeText={(t) => setForm({ customerName: t })} />
            <Field label="Số điện thoại" keyboardType="phone-pad" value={form.customerPhone} onChangeText={(t) => setForm({ customerPhone: t })} />
            <Field label="Ghi chú" multiline value={form.note} onChangeText={(t) => setForm({ note: t })} />
          </Card>

          {draft.orderId || items.length || draft.dirty ? (
            <Pressable onPress={discard} disabled={busy} style={styles.discardBtn}>
              <Text style={styles.discardText}>{draft.orderId ? 'Xoá đơn tạm này' : 'Bỏ đơn đang soạn'}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.bar}>
        <Button title="Lưu đơn tạm" kind="secondary" onPress={saveDraft} busy={busy} style={styles.barBtn} />
        <Button title={`Chốt đơn · ${formatPrice(total)}`} onPress={confirmOrder} busy={busy} disabled={items.length === 0} style={styles.barBtnWide} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  error: { color: colors.danger, textAlign: 'center', margin: spacing.lg },
  pill: { fontSize: 12, fontWeight: '700', color: colors.warn, backgroundColor: colors.warnSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  empty: { color: colors.inkSoft, fontSize: 14, marginVertical: spacing.sm },
  line: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  remove: { fontSize: 16, color: colors.inkSoft, paddingLeft: spacing.sm },
  lineBottom: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.sm, gap: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, color: colors.ink, lineHeight: 22 },
  qty: { minWidth: 30, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.ink },
  priceBox: { flex: 1 },
  unitPrice: { flex: 1, fontSize: 12, color: colors.inkSoft, marginBottom: 12 },
  lineTotal: { minWidth: 90, textAlign: 'right', fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  addRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  addBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 11, alignItems: 'center' },
  addText: { fontSize: 14, fontWeight: '700', color: colors.accentDark },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sumLabel: { color: colors.inkSoft, fontSize: 14 },
  sumValue: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  totalLabel: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  totalValue: { color: colors.accentDark, fontSize: 18, fontWeight: '700' },
  discardBtn: { alignItems: 'center', paddingVertical: spacing.md },
  discardText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
  bar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  barBtn: { flex: 1 },
  barBtnWide: { flex: 1.5 },
});
