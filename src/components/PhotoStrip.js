import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { colors, spacing, radius } from '../theme/theme';
import { Chips } from './FormBits';

// Dai anh san pham dung chung cho luc tao (anh nhap, chua len may chu) va luc sua (anh da luu).
// photos: [{ key, uri, label, primary }]; colorOptions: [{ value, label }] chon mau gan cho anh sap them.
export default function PhotoStrip({ photos, onAdd, onPressPhoto, colorOptions, color, onColor, busy }) {
  return (
    <View>
      {colorOptions.length > 1 ? <Chips label="Ảnh sắp thêm thuộc về" options={colorOptions} value={color} onChange={onColor} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((p) => (
          <Pressable key={p.key} onPress={() => onPressPhoto(p)} style={styles.photo}>
            {p.uri ? <Image source={{ uri: p.uri }} style={styles.img} /> : <View style={styles.img} />}
            {p.primary ? <Text style={styles.badge}>Chính</Text> : null}
            <Text style={styles.label} numberOfLines={1}>{p.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onAdd} disabled={!!busy} style={[styles.photo, styles.add]}>
          {busy ? <><ActivityIndicator color={colors.ink} /><Text style={styles.label}>{busy}</Text></> : (
            <><Text style={styles.plus}>+</Text><Text style={styles.label}>Thêm ảnh</Text></>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 4 },
  photo: { width: 96 },
  img: { width: 96, height: 120, borderRadius: radius.sm, backgroundColor: colors.border },
  label: { fontSize: 11, color: colors.inkSoft, marginTop: 4, textAlign: 'center' },
  badge: {
    position: 'absolute', top: 6, left: 6, backgroundColor: colors.accent, color: colors.ink, fontSize: 10,
    fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden',
  },
  add: {
    height: 120, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  plus: { fontSize: 30, color: colors.accentDark },
});
