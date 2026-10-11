import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, type, spacing, radius } from '../theme/theme';

// Chi hien khi quet ma vach ma he thong khong co san pham tuong ung.
export default function NotFoundScreen({ route, navigation }) {
  const barcode = route.params?.barcode;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>?</Text>
        </View>
        <Text style={type.h1}>Không tìm thấy sản phẩm</Text>
        {barcode ? <Text style={styles.code}>{barcode}</Text> : null}
        <Text style={[type.body, styles.body]}>
          Mã vạch này chưa có trong hệ thống. Quét lại, hoặc báo quản lý thêm sản phẩm với mã vạch này.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.secondaryBtnText}>Về trang chủ</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.replace('Scanner')}>
          <Text style={styles.primaryBtnText}>Quét lại</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.warnSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  badgeText: { fontSize: 28, fontWeight: '700', color: colors.warn },
  code: { marginTop: spacing.sm, fontSize: 14, color: colors.inkSoft, fontVariant: ['tabular-nums'] },
  body: { textAlign: 'center', marginTop: spacing.md },
  footer: { flexDirection: 'row', padding: spacing.lg, gap: spacing.md },
  secondaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
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
