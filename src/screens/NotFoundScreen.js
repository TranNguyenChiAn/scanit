import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { colors, type, spacing, radius } from '../theme/theme';

// Shown only when a scanned barcode has no catalog match.
// Photo-recognition misses never route here — they're ignored in place
// on the Scanner screen instead.
export default function NotFoundScreen({ route, navigation }) {
  const barcode = route.params?.barcode;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>?</Text>
        </View>
        <Text style={type.h1}>No match for this barcode</Text>
        {barcode ? (
          <Text style={styles.code}>{barcode}</Text>
        ) : null}
        <Text style={[type.body, styles.body]}>
          This barcode isn't in the catalog yet. Try scanning again, or use
          photo mode to identify the product instead.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.secondaryBtnText}>Back home</Text>
        </Pressable>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.replace('Scanner')}
        >
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.warnSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  badgeText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.warn,
  },
  code: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  body: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryBtnText: {
    color: colors.ink,
    fontWeight: '600',
    fontSize: 15,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
