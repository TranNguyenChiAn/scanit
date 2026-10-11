import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme/theme';
import { admin, validateProduct, productToForm, variantToForm, EMPTY_PRODUCT } from '../api';
import { formatPrice } from '../utils/format';
import { pickPhotos } from '../utils/imagePicker';
import { Field, Chips, Button, Header, Card, Collapsible, SaveBar } from '../components/FormBits';
import VariantGenerator from '../components/VariantGenerator';
import PhotoStrip from '../components/PhotoStrip';

const TYPE_OPTIONS = [{ value: 'SINGLE', label: 'Món lẻ' }, { value: 'SET', label: 'Set' }];
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang bán' }, { value: 'INACTIVE', label: 'Ẩn' }, { value: 'DISCONTINUED', label: 'Ngừng bán' },
];

const moneyOf = (v) => (v === '' || v == null ? null : Number(String(v).replace(/[^\d]/g, '')));

// Mot man hinh cho ca THEM va SUA san pham.
// Them: dien mot lan (thong tin + mau/size + anh) roi bam "Luu san pham" -> quay ve danh sach.
// Sua: thong tin luu bang nut Luu; mau/size va anh luu ngay khi thao tac.
export default function AdminProductScreen({ route, navigation }) {
  const productId = route.params?.productId ?? null;
  const editing = productId != null;

  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [errors, setErrors] = useState({});
  const [product, setProduct] = useState(null); // sua: du lieu tu may chu
  const [drafts, setDrafts] = useState([]); // them: bien the nhap
  const [draftPhotos, setDraftPhotos] = useState([]); // them: anh nhap
  const [photoColor, setPhotoColor] = useState(null); // them: ten mau | sua: id mau | null = anh chung
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [genBusy, setGenBusy] = useState(false);
  const [knownColors, setKnownColors] = useState([]);
  const initialForm = useRef(JSON.stringify(EMPTY_PRODUCT));
  const formReady = useRef(!editing);
  const allowLeave = useRef(false);
  const scroller = useRef(null);
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  useEffect(() => { admin.listColors().then((c) => setKnownColors(c.map((x) => x.name))).catch(() => {}); }, []);

  // Sua: tai lai moi khi quay ve (sau khi sua bien the). Chi nap form lan dau de khong de mat chinh sua dang go.
  useFocusEffect(
    useCallback(() => {
      if (!editing) return undefined;
      let active = true;
      admin.getProduct(productId)
        .then((p) => {
          if (!active) return;
          setProduct(p);
          if (!formReady.current) {
            const f = productToForm(p);
            initialForm.current = JSON.stringify(f);
            setForm(f);
            formReady.current = true;
          }
        })
        .catch((e) => active && Alert.alert('Lỗi', e.message || 'Không tải được sản phẩm.'))
        .finally(() => active && setLoading(false));
      return () => { active = false; };
    }, [editing, productId])
  );

  // Ket qua tu man hinh bien the (che do nhap)
  const draftResult = route.params?.draftResult;
  useEffect(() => {
    if (!draftResult) return;
    setDrafts((list) => {
      if (draftResult.index == null) return [...list, draftResult.form];
      return list.map((d, i) => (i === draftResult.index ? draftResult.form : d));
    });
    navigation.setParams({ draftResult: undefined });
  }, [draftResult, navigation]);

  const dirty = editing
    ? formReady.current && JSON.stringify(form) !== initialForm.current
    : JSON.stringify(form) !== initialForm.current || drafts.length > 0 || draftPhotos.length > 0;

  // Thoat khi dang go do: hoi lai de khong mat cong
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (allowLeave.current || !dirty || saving) return;
    e.preventDefault();
    Alert.alert('Bỏ thay đổi?', 'Những gì bạn vừa nhập chưa được lưu.', [
      { text: 'Ở lại', style: 'cancel' },
      { text: 'Bỏ', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
    ]);
  }), [navigation, dirty, saving]);

  function finish(toast) {
    allowLeave.current = true;
    navigation.navigate('AdminProducts', { toast });
  }

  function validate() {
    const problem = validateProduct(form);
    if (!problem) return true;
    setErrors({
      styleCode: form.styleCode?.trim() ? undefined : 'Nhập mã mẫu (ví dụ 8922).',
      name: form.name?.trim() ? undefined : 'Nhập tên sản phẩm.',
    });
    scroller.current?.scrollTo({ y: 0, animated: true });
    return false;
  }

  // ---------- Luu ----------
  async function saveEdit() {
    if (!validate()) return;
    setSaving(true);
    try {
      await admin.updateProduct(productId, form);
      finish('Đã lưu thay đổi');
    } catch (e) {
      Alert.alert('Không lưu được', e.message || 'Thử lại.');
      setSaving(false);
    }
  }

  async function saveCreate(skipWarn = false) {
    if (!validate()) return;
    if (!drafts.length && !skipWarn) {
      return Alert.alert('Chưa có màu / size', 'Sản phẩm chưa có biến thể thì chưa quét mã vạch hay bán được. Vẫn lưu?', [
        { text: 'Thêm màu / size', style: 'cancel' },
        { text: 'Vẫn lưu', onPress: () => saveCreate(true) },
      ]);
    }
    setSaving(true);
    let created;
    try {
      setProgress('Đang tạo sản phẩm…');
      created = await admin.createProduct(form, drafts);
    } catch (e) {
      setProgress(null);
      setSaving(false);
      return Alert.alert('Không lưu được', e.message || 'Thử lại.');
    }

    let failed = 0;
    for (let i = 0; i < draftPhotos.length; i += 1) {
      setProgress(`Đang tải ảnh ${i + 1}/${draftPhotos.length}…`);
      const p = draftPhotos[i];
      const match = p.color ? created.variants.find((v) => v.color.name.toLowerCase() === p.color.toLowerCase()) : null;
      try {
        await admin.uploadPhoto(created.id, { uri: p.uri, name: 'photo.jpg', type: 'image/jpeg' }, match?.color.id);
      } catch (e) {
        failed += 1;
      }
    }
    setProgress(null);
    if (failed) {
      Alert.alert('Đã lưu sản phẩm', `${failed}/${draftPhotos.length} ảnh chưa tải lên được. Mở sản phẩm để thêm lại ảnh.`,
        [{ text: 'OK', onPress: () => finish(`Đã thêm "${form.name.trim()}"`) }]);
    } else {
      finish(`Đã thêm "${form.name.trim()}"`);
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
            finish('Đã xoá sản phẩm');
          } catch (e) {
            Alert.alert('Không xoá được', e.message || 'Thử lại.');
          }
        },
      },
    ]);
  }

  // ---------- Bien the ----------
  const serverVariants = (product?.variants || []).filter((v) => v.status === 'ACTIVE');

  const rows = useMemo(() => {
    const price = (list, type) => list?.find((p) => p.type === type && p.minQty === 1)?.price ?? null;
    if (editing) {
      return serverVariants.map((v) => ({
        key: `s${v.id}`, color: v.color.name, size: v.size.name, retail: price(v.prices, 'RETAIL'),
        wholesale: price(v.prices, 'WHOLESALE'), note: v.note, quantity: v.quantity, server: v,
      }));
    }
    return drafts.map((d, i) => ({
      key: `d${i}`, color: d.color, size: d.size, retail: moneyOf(d.retail), wholesale: moneyOf(d.wholesale), note: d.note, index: i,
    }));
  }, [editing, serverVariants, drafts]);

  // Bien the moi lay san size va cac loai gia cua bien the dau tien (chi can doi mau)
  const template = useMemo(() => {
    const forms = editing ? serverVariants.map(variantToForm) : drafts;
    if (!forms.length) return null;
    // Lay tu bien the dau tien; truong nao bien the dau bo trong thi lay o bien the ke tiep
    const pick = (k) => forms.map((f) => f[k]).find((v) => v !== undefined && v !== null && String(v).trim() !== '') ?? '';
    return { size: pick('size'), retail: pick('retail'), wholesale: pick('wholesale'), cost: pick('cost') };
  }, [editing, serverVariants, drafts]);

  function addOne() {
    if (editing) navigation.navigate('AdminVariant', { productId, template });
    else navigation.navigate('AdminVariant', { mode: 'draft', draft: null, index: null, template });
  }

  function openRow(r) {
    if (r.server) navigation.navigate('AdminVariant', { productId, variant: r.server });
    else navigation.navigate('AdminVariant', { mode: 'draft', draft: drafts[r.index], index: r.index });
  }

  function removeRow(r) {
    if (!r.server) {
      setDrafts((l) => l.filter((_, i) => i !== r.index));
      return;
    }
    Alert.alert('Xoá biến thể', `Xoá ${r.color} / ${r.size}?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          try { setProduct(await admin.deleteVariant(r.server.id)); } catch (e) { Alert.alert('Không xoá được', e.message || 'Thử lại.'); }
        },
      },
    ]);
  }

  async function generate(list) {
    if (!editing) {
      setDrafts((d) => [...d, ...list]);
      return true;
    }
    setGenBusy(true);
    let failed = 0;
    let last = product;
    for (const v of list) {
      try { last = await admin.addVariant(productId, v); } catch (e) { failed += 1; }
    }
    setProduct(last);
    setGenBusy(false);
    if (failed) Alert.alert('Một số biến thể chưa thêm được', `${failed}/${list.length} lỗi. Thử lại phần còn thiếu.`);
    return failed === 0;
  }

  // ---------- Anh ----------
  const colorOptions = useMemo(() => {
    const opts = [{ value: null, label: 'Ảnh chung' }];
    const seen = new Set();
    for (const r of rows) {
      const value = editing ? r.server.color.id : r.color.trim();
      if (!value || seen.has(String(value).toLowerCase())) continue;
      seen.add(String(value).toLowerCase());
      opts.push({ value, label: r.color });
    }
    return opts;
  }, [rows, editing]);

  const photos = editing
    ? (product?.media || []).map((m) => ({
      key: `m${m.id}`, uri: m.thumbUrl || m.url, primary: m.primary, media: m,
      label: m.colorId ? serverVariants.find((v) => v.color.id === m.colorId)?.color.name || '' : 'Chung',
    }))
    : draftPhotos.map((p, i) => ({ key: `p${i}`, uri: p.uri, label: p.color || 'Chung', index: i }));

  function addPhotoMenu() {
    Alert.alert('Thêm ảnh', 'Ảnh được nén tự động trước khi lưu.', [
      { text: 'Chọn từ thư viện', onPress: () => addPhotos('library') },
      { text: 'Chụp ảnh', onPress: () => addPhotos('camera') },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  }

  async function addPhotos(source) {
    try {
      const picked = await pickPhotos(source);
      if (!picked.length) return;
      if (!editing) {
        setDraftPhotos((l) => [...l, ...picked.map((p) => ({ uri: p.uri, color: photoColor }))]);
        return;
      }
      let failed = 0;
      let lastErr = null;
      for (let i = 0; i < picked.length; i += 1) {
        setUploading(`${i + 1}/${picked.length}`);
        try {
          await admin.uploadPhoto(productId, { uri: picked[i].uri, name: 'photo.jpg', type: 'image/jpeg' }, photoColor);
        } catch (e) { failed += 1; lastErr = e; }
      }
      setProduct(await admin.getProduct(productId));
      if (failed) Alert.alert('Một số ảnh chưa tải được', `${failed} ảnh lỗi: ${lastErr?.message || ''}`);
    } catch (e) {
      Alert.alert('Không thêm được ảnh', e.message || 'Thử lại.');
    } finally {
      setUploading(null);
    }
  }

  function photoMenu(p) {
    if (!editing) {
      return Alert.alert('Ảnh', undefined, [
        { text: 'Xoá ảnh', style: 'destructive', onPress: () => setDraftPhotos((l) => l.filter((_, i) => i !== p.index)) },
        { text: 'Huỷ', style: 'cancel' },
      ]);
    }
    const act = (fn) => async () => {
      try { await fn(); setProduct(await admin.getProduct(productId)); } catch (e) { Alert.alert('Lỗi', e.message); }
    };
    return Alert.alert('Ảnh', undefined, [
      ...(p.primary ? [] : [{ text: 'Đặt làm ảnh chính', onPress: act(() => admin.setPrimaryPhoto(productId, p.media.id)) }]),
      { text: 'Xoá ảnh', style: 'destructive', onPress: act(() => admin.deletePhoto(productId, p.media.id)) },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  }

  if (loading) {
    return <SafeAreaView style={[styles.screen, styles.center]}><ActivityIndicator color={colors.ink} /></SafeAreaView>;
  }

  const moreFilled = [form.description, form.material, form.season, form.categories, form.brand].some((x) => x?.trim());
  const moreSummary = moreFilled ? 'Đã nhập' : 'Mô tả, chất liệu, mùa, danh mục, thương hiệu';

  return (
    <SafeAreaView style={styles.screen}>
      <Header title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroller} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card title="Thông tin chính">
            <Field label="Mã mẫu *" value={form.styleCode} onChangeText={set('styleCode')} placeholder="vd 8922"
              autoCapitalize="characters" error={errors.styleCode} />
            <Field label="Tên sản phẩm *" value={form.name} onChangeText={set('name')} placeholder="vd Set len khoá kéo 8922#" error={errors.name} />
            <Chips label="Loại" options={TYPE_OPTIONS} value={form.productType} onChange={set('productType')} />
            {form.productType === 'SET' ? (
              <Field label="Gồm những món" value={form.components} onChangeText={set('components')}
                placeholder="Áo khoác len, Chân váy dài" hint="Cách nhau bằng dấu phẩy" style={{ marginBottom: 0 }} />
            ) : null}
          </Card>

          <Card title={`Màu & size${rows.length ? ` (${rows.length})` : ''}`} subtitle="Mỗi màu + size là một biến thể có mã vạch và tồn kho riêng"
            action={<Pressable onPress={addOne} hitSlop={8}><Text style={styles.link}>+ Thêm 1</Text></Pressable>}>
            {rows.length === 0 ? <Text style={styles.empty}>Chưa có biến thể nào.</Text> : null}
            {rows.map((r) => (
              <Pressable key={r.key} style={styles.variantRow} onPress={() => openRow(r)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.variantTitle}>{r.color} · {r.size}</Text>
                  <Text style={styles.variantSub}>
                    {r.retail != null ? `Lẻ ${formatPrice(r.retail)}` : 'Chưa có giá lẻ'}{r.wholesale != null ? ` · Sỉ ${formatPrice(r.wholesale)}` : ''}
                  </Text>
                  {r.note ? <Text style={styles.variantNote} numberOfLines={1}>📝 {r.note}</Text> : null}
                </View>
                {r.quantity != null ? <Text style={styles.qty}>Tồn {r.quantity}</Text> : null}
                <Pressable onPress={() => removeRow(r)} hitSlop={10} style={styles.remove}><Text style={styles.removeText}>✕</Text></Pressable>
              </Pressable>
            ))}
            <VariantGenerator defaults={template} existing={rows.map((r) => ({ color: r.color, size: r.size }))} onGenerate={generate} busy={genBusy}
              colorSuggestions={knownColors} />
          </Card>

          <Card title={`Ảnh${photos.length ? ` (${photos.length})` : ''}`}
            subtitle="Mỗi màu nên có 2–4 ảnh (mặt trước, sau, cận chất liệu) để quét ảnh nhận đúng hơn">
            <PhotoStrip photos={photos} onAdd={addPhotoMenu} onPressPhoto={photoMenu} colorOptions={colorOptions}
              color={photoColor} onColor={setPhotoColor} busy={uploading} />
          </Card>

          <Collapsible title="Thông tin thêm" subtitle={moreSummary} defaultOpen={editing && moreFilled}>
            <Field label="Mô tả" value={form.description} onChangeText={set('description')} multiline />
            <Field label="Chất liệu" value={form.material} onChangeText={set('material')} />
            <Field label="Mùa" value={form.season} onChangeText={set('season')} placeholder="Thu đông 2026" />
            <Field label="Danh mục" value={form.categories} onChangeText={set('categories')} placeholder="Set len" hint="Cách nhau bằng dấu phẩy" />
            <Field label="Thương hiệu" value={form.brand} onChangeText={set('brand')} />
            <Chips label="Trạng thái" options={STATUS_OPTIONS} value={form.status} onChange={set('status')} />
          </Collapsible>

          {editing ? <Button title="Xoá sản phẩm" kind="danger" onPress={confirmDelete} style={{ marginTop: spacing.md }} /> : null}
        </ScrollView>

        <SaveBar title={editing ? 'Lưu thay đổi' : 'Lưu sản phẩm'} onPress={editing ? saveEdit : () => saveCreate()}
          busy={saving} note={editing ? 'Màu, size và ảnh được lưu ngay khi thao tác' : null} />
      </KeyboardAvoidingView>

      {progress ? (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator color={colors.ink} />
            <Text style={styles.overlayText}>{progress}</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: 40 },
  link: { fontSize: 14, fontWeight: '700', color: colors.accentDark },
  empty: { fontSize: 13, color: colors.inkSoft, marginTop: spacing.sm },
  variantRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, padding: spacing.sm, paddingLeft: spacing.md, marginTop: spacing.sm,
  },
  variantTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  variantSub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  variantNote: { fontSize: 12, color: colors.warn, marginTop: 2 },
  qty: { fontSize: 13, fontWeight: '700', color: colors.ink, marginLeft: spacing.sm },
  remove: { paddingHorizontal: 10, paddingVertical: 6 },
  removeText: { fontSize: 15, color: colors.inkSoft },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  overlayBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', minWidth: 200 },
  overlayText: { marginTop: spacing.sm, fontSize: 14, color: colors.ink, fontWeight: '600' },
});
