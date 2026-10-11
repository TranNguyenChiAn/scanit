import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/theme';
import { admin, validateVariant, variantToForm, buildStockRequest, EMPTY_VARIANT } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Field, Chips, Button, Header, Section } from '../components/FormBits';

const SIZES = ['Free size', 'S', 'M', 'L', 'XL', 'XXL'];

// Them / sua mot bien the (mau + size): ma, gia, ton. Sua thi co them nhap/xuat/kiem kho.
export default function AdminVariantScreen({ route, navigation }) {
  const { productId, variant } = route.params;
  const creating = !variant;
  const { user } = useAuth();
  const canStock = !!user?.permissions?.includes('stock.adjust');
  const [form, setForm] = useState(creating ? EMPTY_VARIANT : variantToForm(variant));
  const [colorsKnown, setColorsKnown] = useState([]);
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(variant?.quantity ?? 0);
  const [stockAmount, setStockAmount] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [stockBusy, setStockBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!creating) return;
    admin.listColors().then((c) => setColorsKnown(c.map((x) => x.name))).catch(() => {});
  }, [creating]);

  async function save() {
    const problem = validateVariant(form, { creating });
    if (problem) return Alert.alert('Chưa đủ thông tin', problem);
    setSaving(true);
    try {
      if (creating) await admin.addVariant(productId, form);
      else await admin.updateVariant(variant, form);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Không lưu được', e.message || 'Thử lại.');
      setSaving(false);
    }
  }

  async function adjust(mode) {
    let body;
    try {
      body = buildStockRequest(mode, stockAmount, stockNote);
    } catch (e) {
      return Alert.alert('Chưa đúng', e.message);
    }
    setStockBusy(true);
    try {
      const r = await admin.adjustStock(variant.id, body);
      setQuantity(r.quantity);
      setStockAmount('');
      setStockNote('');
    } catch (e) {
      Alert.alert('Không cập nhật được tồn', e.message || 'Thử lại.');
    } finally {
      setStockBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Xoá biến thể', `Xoá ${variant.color.name} / ${variant.size.name}?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          try {
            await admin.deleteVariant(variant.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Không xoá được', e.message || 'Thử lại.');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Header title={creating ? 'Thêm màu / size' : `${variant.color.name} · ${variant.size.name}`} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {creating ? (
            <>
              <Field label="Màu *" value={form.color} onChangeText={set('color')} placeholder="vd Xám than" />
              {colorsKnown.length ? (
                <Chips options={colorsKnown.slice(0, 12).map((c) => ({ value: c, label: c }))} value={form.color} onChange={set('color')} />
              ) : null}
              <Field label="Size *" value={form.size} onChangeText={set('size')} placeholder="vd Free size, M" />
              <Chips options={SIZES.map((s) => ({ value: s, label: s }))} value={form.size} onChange={set('size')} />
            </>
          ) : null}

          <Field label="Giá lẻ (đ)" value={form.retail} onChangeText={set('retail')} keyboardType="number-pad" placeholder="vd 490000" />
          <Field label="Giá sỉ (đ)" value={form.wholesale} onChangeText={set('wholesale')} keyboardType="number-pad" placeholder="vd 410000" />
          <Field label="Giá vốn (đ)" value={form.cost} onChangeText={set('cost')} keyboardType="number-pad" hint="Chỉ quản lý thấy" />
          <Field label="SKU" value={form.sku} onChangeText={set('sku')} autoCapitalize="characters" hint="Để trống: tự tạo từ mã mẫu, màu, size" />
          <Field label="Mã vạch" value={form.barcode} onChangeText={set('barcode')} keyboardType="number-pad"
            hint={creating ? 'Để trống: hệ thống tự tạo mã để in tem' : 'Xoá trống rồi lưu để tạo mã mới'} />
          <Field label="Cảnh báo sắp hết khi tồn ≤" value={form.minQuantity} onChangeText={set('minQuantity')} keyboardType="number-pad" />
          {creating ? <Field label="Tồn đầu kỳ" value={form.quantity} onChangeText={set('quantity')} keyboardType="number-pad" placeholder="0" /> : null}

          <Button title={creating ? 'Thêm biến thể' : 'Lưu'} onPress={save} busy={saving} />

          {!creating && canStock ? (
            <Section title={`Tồn kho: ${quantity}`}>
              <Field label="Số lượng" value={stockAmount} onChangeText={setStockAmount} keyboardType="number-pad" />
              <Field label="Ghi chú" value={stockNote} onChangeText={setStockNote} placeholder="vd Nhập thêm đợt 2" />
              <View style={styles.row}>
                <Button title="Nhập thêm" onPress={() => adjust('add')} busy={stockBusy} style={styles.flex} />
                <Button title="Xuất bớt" kind="secondary" onPress={() => adjust('remove')} busy={stockBusy} style={styles.flex} />
              </View>
              <Button title="Kiểm kho: đặt tồn bằng số trên" kind="secondary" onPress={() => adjust('set')} busy={stockBusy} style={{ marginTop: spacing.sm }} />
            </Section>
          ) : null}

          {!creating ? <Button title="Xoá biến thể" kind="danger" onPress={confirmDelete} style={{ marginTop: spacing.xl }} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 60 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
