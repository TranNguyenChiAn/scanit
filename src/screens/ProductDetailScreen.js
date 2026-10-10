import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { colors, type, spacing, radius } from '../theme/theme';
import { formatPrice, imageSource } from '../utils/format';

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={imageSource(product.image)} style={styles.image} />

        <View style={styles.body}>
          <Text style={type.label}>{product.category.toUpperCase()}</Text>
          <Text style={[type.display, styles.name]}>{product.name}</Text>
          <Text style={styles.brand}>{product.brand}</Text>

          <Text style={type.price}>{formatPrice(product)}</Text>

          <View style={styles.divider} />

          <Text style={type.h2}>Description</Text>
          <Text style={[type.body, styles.description]}>
            {product.description}
          </Text>

          <View style={styles.divider} />

          <Text style={type.h2}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Barcode</Text>
            <Text style={styles.detailValue}>{product.barcode}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Brand</Text>
            <Text style={styles.detailValue}>{product.brand}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{product.category}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.secondaryBtnText}>Done</Text>
        </Pressable>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.replace('Scanner')}
        >
          <Text style={styles.primaryBtnText}>Scan another</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  image: {
    width: '100%',
    height: 280,
    backgroundColor: colors.surface,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  name: {
    marginTop: spacing.xs,
  },
  brand: {
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  description: {
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    color: colors.inkSoft,
    fontSize: 14,
  },
  detailValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
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
