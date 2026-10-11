import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius } from '../theme/theme';
import { admin, validateProduct, productToForm, EMPTY_PRODUCT } from '../api';
import { formatPrice } from '../utils/format';
import { Field, Chips, Button, Header, Section } from '../components/FormBits';

const TYPE_OPTIONS = [{ value: 'SINGLE', label: 'Món lẻ' }, { value: 'SET', label: 'Set' }];
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang bán' }, { value: 'INACTIVE', label: 'Ẩn' }, { value: 'DISCONTINUED', label: 'Ngừng bán' },
];

// Them / sua san pham, quan ly bien the (mau x size, gia, ton) va anh.
export default function AdminProductScreen({ route, navigation }) {
  const productId = route.params?.productId ?? null;
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [photoColor, setPhotoColor] = useState(null); // null = anh chung
  const [uploading, setUploading] = useState(null); // '2/3'
  const formReady = useRef(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // Tai lai moi khi quay ve (sau khi them/sua bien the). Chi nap form lan dau de khong de mat chinh sua dang go.
  useFocusEffect(
    useCallback(() => {
      if (!productId) return undefined;
      let active = true;
      admin.getProduct(productId)
        .then((p) => {
          if (!active) return;
          setProduct(p);
          if (!formReady.current) {
            setForm(productToForm(p));
            formReady.current = true;
          }
        })
        .catch((e) => active && Alert.alert('Lỗi', e.message || 'Không tải được sản phẩm.'))
        .finally(() => active && setLoading(false));
      return () => { active = false; };
    }, [productId])
  );

  useEffect(() => { if (!productId) formReady.current = true; }, [productId]);

  async function save() {
    const problem = validateProduct(form);
    if (problem) return Alert.alert('Chưa đủ thông tin', problem);
    setSaving(true);
    try {
      if (productId) {
        setProduct(await admin.updateProduct(productId, form));
        Alert.alert('Đã lưu', 'Thông tin sản phẩm đã được cập nhật.');
      } else {
        const created = await admin.createProduct(form);
        // Chuyen sang man hinh sua de them mau/size va anh ngay
        navigation.replace('AdminProduct', { productId: created.id });
      }
    } catch (e) {
      Alert.alert('Không lưu được', e.message || 'Thử lại.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Xoá sản phẩm', `Xoá "${form.name}" cùng toàn bộ biến thể? Lịch sử kho vẫn được giữ.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          try {
            await admin.deleteProduct(productId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Không xoá được', e.message || 'Thử lại.');
          }
        },
      },
    ]);
  }

  function confirmDeleteVariant(v) {
    Alert.alert('Xoá biến thể', `Xoá ${v.color.name} / ${v.size.name}?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          try {
            setProduct(await admin.deleteVariant(v.id));
          } catch (e) {
            Alert.alert('Không xoá được', e.message || 'Thử lại.');
          }
        },
      },
    ]);
  }

  async function pickAndUpload(source) {
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Cần quyền truy cập', 'Hãy cho phép trong Cài đặt để thêm ảnh.');
      const opts = { mediaTypes: ['images'], quality: 0.8 };
      const res = source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: 6 });
      if (res.canceled || !res.assets?.length) return;

      let failed = 0;
      let lastError = null;
      for (let i = 0; i < res.assets.length; i += 1) {
        setUploading(`${i + 1}/${res.assets.length}`);
        try {
          await admin.uploadPhoto(productId, { uri: res.assets[i].uri, name: 'photo.jpg', type: 'image/jpeg' }, photoColor);
        } catch (e) {
          failed += 1;
          lastError = e;
        }
      }
      setProduct(await admin.getProduct(productId));
      if (failed) Alert.alert('Một số ảnh chưa tải được', `${failed} ảnh lỗi: ${lastError?.message || ''}`);
    } catch (e) {
      Alert.alert('Không thêm được ảnh', e.message || 'Thử lại.');
    } finally {
      setUploading(null);
    }
  }

  function photoMenu(m) {
    Alert.alert('Ảnh', undefined, [
      ...(m.primary ? [] : [{
        text: 'Đặt làm ảnh chính',
        onPress: async () => {
          try {
            await admin.setPrimaryPhoto(productId, m.id);
            setProduct(await admin.getProduct(productId));
          } catch (e) { Alert.alert('Lỗi', e.message); }
        },
      }]),
      {
        text: 'Xoá ảnh', style: 'destructive',
        onPress: async () => {
          try {
            await admin.deletePhoto(productId, m.id);
            setProduct(await admin.getProduct(productId));
          } catch (e) { Alert.alert('Lỗi', e.message); }
        },
      },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  }

  function addPhotoMenu() {
    Alert.alert('Thêm ảnh', 'Ảnh sẽ được nén tự động trước khi lưu.', [
      { text: 'Chọn từ thư viện', onPress: () => pickAndUpload('library') },
      { text: 'Chụp ảnh', onPress: () => pickAndUpload('camera') },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  }

  if (loading) {
    return <SafeAreaView style={[styles.screen, styles.center]}><ActivityIndicator color={colors.ink} /></SafeAreaView>;
  }

  const variants = (product?.variants || []).filter((v) => v.status === 'ACTIVE');
  const colorOptions = [{ value: null, label: 'Ảnh chung' }];
  const seen = new Set();
  for (const v of variants) {
    if (!seen.has(v.color.id)) {
      seen.add(v.color.id);
      colorOptions.push({ value: v.color.id, label: v.color.name });
    }
  }
  const colorName = (id) => (id ? variants.find((v) => v.color.id === id)?.color.name || '' : 'Chung');

  return (
    <SafeAreaView style={styles.screen}>
      <Header title={productId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label="Mã mẫu *" value={form.styleCode} onChangeText={set('styleCode')} placeholder="vd 8922" autoCapitalize="characters" />
          <Field label="Tên sản phẩm *" value={form.name} onChangeText={set('name')} placeholder="vd Set len khoá kéo 8922#" />
          <Chips label="Loại" options={TYPE_OPTIONS} value={form.productType} onChange={set('productType')} />
          {form.productType === 'SET' ? (
            <Field label="Gồm những món" value={form.components} onChangeText={set('components')}
              placeholder="Áo khoác len, Chân váy dài" hint="Cách nhau bằng dấu phẩy" />
          ) : null}
          <Field label="Mô tả" value={form.description} onChangeText={set('description')} multiline />
          <Field label="Chất liệu" value={form.material} onChangeText={set('material')} />
          <Field label="Mùa" value={form.season} onChangeText={set('season')} placeholder="Thu đông 2026" />
          <Field label="Danh mục" value={form.categories} onChangeText={set('categories')} placeholder="Set len" hint="Cách nhau bằng dấu phẩy" />
          <Field label="Thương hiệu" value={form.brand} onChangeText={set('brand')} />
          <Chips label="Trạng thái" options={STATUS_OPTIONS} value={form.status} onChange={set('status')} />

          <Button title={productId ? 'Lưu thông tin' : 'Tạo sản phẩm'} onPress={save} busy={saving} />
          {!productId ? <Text style={styles.note}>Sau khi tạo, bạn sẽ thêm màu, size, giá và ảnh.</Text> : null}

          {productId && product ? (
            <>
              <Section
                title={`Màu / size (${variants.length})`}
                action={<Pressable onPress={() => navigation.navigate('AdminVariant', { productId })}><Text style={styles.link}>+ Thêm</Text></Pressable>}
              >
                {variants.length === 0 ? <Text style={styles.note}>Chưa có biến thể. Thêm màu và size để bán và quét mã vạch.</Text> : null}
                {variants.map((v) => {
                  const retail = v.prices.find((p) => p.type === 'RETAIL' && p.minQty === 1)?.price;
                  const whole = v.prices.find((p) => p.type === 'WHOLESALE' && p.minQty === 1)?.price;
                  return (
                    <Pressable key={v.id} style={styles.variantRow} onPress={() => navigation.navigate('AdminVariant', { productId, variant: v })}
                      onLongPress={() => confirmDeleteVariant(v)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.variantTitle}>{v.color.name} · {v.size.name}</Text>
                        <Text style={styles.variantSub}>
                          {retail != null ? `Lẻ ${formatPrice(retail)}` : 'Chưa có giá lẻ'}{whole != null ? ` · Sỉ ${formatPrice(whole)}` : ''}
                        </Text>
                        <Text style={styles.variantSub}>{v.sku} · {v.barcode || 'chưa có mã vạch'}</Text>
                      </View>
                      <Text style={[styles.qty, v.quantity <= v.minQuantity && styles.qtyLow]}>Tồn {v.quantity}</Text>
                    </Pressable>
                  );
                })}
                {variants.length ? <Text style={styles.hint}>Bấm để sửa, giữ lâu để xoá.</Text> : null}
              </Section>

              <Section title={`Ảnh (${product.media.length})`}>
                <Chips label="Thêm ảnh cho" options={colorOptions} value={photoColor} onChange={setPhotoColor} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                  {product.media.map((m) => (
                    <Pressable key={m.id} onPress={() => photoMenu(m)} style={styles.photo}>
                      {m.thumbUrl ? <Image source={{ uri: m.thumbUrl }} style={styles.photoImg} /> : <View style={[styles.photoImg, styles.photoEmpty]} />}
                      {m.primary ? <Text style={styles.badge}>Chính</Text> : null}
                      <Text style={styles.photoLabel} numberOfLines={1}>{colorName(m.colorId)}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={addPhotoMenu} disabled={!!uploading} style={[styles.photo, styles.addPhoto]}>
                    {uploading ? <><ActivityIndicator color={colors.ink} /><Text style={styles.photoLabel}>{uploading}</Text></> : <Text style={styles.plus}>+</Text>}
                  </Pressable>
                </ScrollView>
                <Text style={styles.hint}>Mỗi màu nên có 2–4 ảnh (mặt trước, sau, cận chất liệu) để quét ảnh nhận đúng hơn.</Text>
              </Section>

              <Button title="Xoá sản phẩm" kind="danger" onPress={confirmDelete} style={{ marginTop: spacing.xl }} />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: 60 },
  note: { fontSize: 13, color: colors.inkSoft, marginTop: spacing.sm, lineHeight: 18 },
  hint: { fontSize: 12, color: '#7A8396', marginTop: spacing.sm },
  link: { fontSize: 15, fontWeight: '700', color: colors.accentDark },
  variantRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  variantTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  variantSub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  qty: { fontSize: 14, fontWeight: '700', color: colors.ink, marginLeft: spacing.sm },
  qtyLow: { color: colors.warn },
  photoRow: { gap: 10, paddingVertical: 4 },
  photo: { width: 96 },
  photoImg: { width: 96, height: 120, borderRadius: radius.sm, backgroundColor: colors.border },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  photoLabel: { fontSize: 11, color: colors.inkSoft, marginTop: 4, textAlign: 'center' },
  badge: {
    position: 'absolute', top: 6, left: 6, backgroundColor: colors.accent, color: colors.ink, fontSize: 10,
    fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden',
  },
  addPhoto: {
    height: 120, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  plus: { fontSize: 32, color: colors.accentDark },
});
