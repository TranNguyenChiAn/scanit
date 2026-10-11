import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius } from '../theme/theme';
import { generateVariants, splitList } from '../api';
import { Field, Button } from './FormBits';

const QUICK_SIZES = ['Free size', 'S', 'M', 'L', 'XL'];

// Them nhieu mau x nhieu size mot lan: nhap "Be, Den, Xam" + chon size -> sinh tat ca to hop.
// onGenerate(variants) nhan ve danh sach form bien the; existing de bo qua to hop da co.
export default function VariantGenerator({ existing, onGenerate, busy, colorSuggestions = [], defaults = null }) {
  const [open, setOpen] = useState(false);
  // Mo ra la co san size va gia cua bien the dau tien
  // Chi luu cac o nguoi dung da go; o chua dung toi luon theo bien the dau tien (ke ca khi bien the dau them sau luc mo bang)
  const [edits, setEdits] = useState({});
  const f = {
    colors: '', sizes: defaults?.size || '', retail: defaults?.retail || '', wholesale: defaults?.wholesale || '',
    cost: defaults?.cost || '', note: '', ...edits,
  };
  const set = (k) => (v) => setEdits((x) => ({ ...x, [k]: v }));

  const preview = useMemo(() => generateVariants({ ...f, existing }), [f.colors, f.sizes, f.retail, f.wholesale, f.cost, f.note, existing]);

  function toggleSize(s) {
    const cur = splitList(f.sizes);
    const has = cur.some((x) => x.toLowerCase() === s.toLowerCase());
    set('sizes')((has ? cur.filter((x) => x.toLowerCase() !== s.toLowerCase()) : [...cur, s]).join(', '));
  }
  function addColor(c) {
    const cur = splitList(f.colors);
    if (!cur.some((x) => x.toLowerCase() === c.toLowerCase())) set('colors')([...cur, c].join(', '));
  }

  async function run() {
    if (!preview.variants.length) return;
    const ok = await onGenerate(preview.variants);
    if (ok !== false) setEdits({});
  }

  if (!open) {
    return (
      <Pressable onPress={() => { setEdits({}); setOpen(true); }} style={styles.toggle}>
        <Text style={styles.toggleText}>+ Thêm nhiều màu / size cùng lúc</Text>
      </Pressable>
    );
  }

  const sizeActive = (s) => splitList(f.sizes).some((x) => x.toLowerCase() === s.toLowerCase());
  const tooMany = preview.variants.length > 100;

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Text style={styles.title}>Thêm nhiều biến thể</Text>
        <Pressable onPress={() => setOpen(false)} hitSlop={10}><Text style={styles.close}>Đóng</Text></Pressable>
      </View>
      <Field label="Các màu" value={f.colors} onChangeText={set('colors')} placeholder="Be, Đen, Xám than" hint="Cách nhau bằng dấu phẩy" />
      {colorSuggestions.length ? (
        <View style={styles.chipRow}>
          {colorSuggestions.slice(0, 10).map((c) => (
            <Pressable key={c} onPress={() => addColor(c)} style={styles.chip}><Text style={styles.chipText}>{c}</Text></Pressable>
          ))}
        </View>
      ) : null}
      <Field label="Các size" value={f.sizes} onChangeText={set('sizes')} placeholder="Free size hoặc S, M, L" style={{ marginTop: spacing.md }} />
      <View style={[styles.chipRow, { marginBottom: spacing.md }]}>
        {QUICK_SIZES.map((s) => (
          <Pressable key={s} onPress={() => toggleSize(s)} style={[styles.chip, sizeActive(s) && styles.chipOn]}>
            <Text style={[styles.chipText, sizeActive(s) && styles.chipTextOn]}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <Field label="Giá lẻ (đ)" value={f.retail} onChangeText={set('retail')} keyboardType="number-pad" style={styles.flex} />
        <Field label="Giá sỉ (đ)" value={f.wholesale} onChangeText={set('wholesale')} keyboardType="number-pad" style={styles.flex} />
      </View>
      <Field label="Giá vốn (đ)" value={f.cost} onChangeText={set('cost')} keyboardType="number-pad" hint="Chỉ quản lý thấy" />
      <Field label="Ghi chú chung" value={f.note} onChangeText={set('note')} placeholder="vd Hàng order, về cuối tháng" />
      <Text style={styles.preview}>
        {preview.variants.length
          ? `Sẽ thêm ${preview.variants.length} biến thể${preview.skipped ? ` (bỏ qua ${preview.skipped} cái đã có)` : ''}`
          : preview.skipped ? 'Các tổ hợp này đã có hết.' : 'Nhập màu và size để xem số biến thể sẽ tạo.'}
      </Text>
      {tooMany ? <Text style={styles.warn}>Tối đa 100 biến thể mỗi lần.</Text> : null}
      <Button title={preview.variants.length ? `Thêm ${preview.variants.length} biến thể` : 'Thêm'} onPress={run}
        busy={busy} disabled={!preview.variants.length || tooMany} />
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    marginTop: spacing.sm, paddingVertical: 12, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: colors.accent, alignItems: 'center',
  },
  toggleText: { fontSize: 14, fontWeight: '700', color: colors.accentDark },
  box: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink },
  close: { fontSize: 14, color: colors.inkSoft, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -4 },
  chip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 12, color: colors.inkSoft, fontWeight: '600' },
  chipTextOn: { color: colors.white },
  preview: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: spacing.sm },
  warn: { fontSize: 12, color: colors.danger, marginBottom: spacing.sm },
});
