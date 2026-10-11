import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, type, spacing, radius } from '../theme/theme';
import { formatPrice } from '../utils/format';
import ProductImage from './ProductImage';

export default function ProductCard({ product, onPress }) {
  const variantInfo = product.attributes?.map((a) => a.value).filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={() => onPress?.(product)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <ProductImage url={product.image} width={160} style={styles.thumb} compact />
      <View style={styles.info}>
        <Text style={[type.h2, styles.name]} numberOfLines={1}>
          {product.name}
        </Text>
        {variantInfo ? (
          <Text style={styles.variant} numberOfLines={1}>
            {variantInfo}
          </Text>
        ) : null}
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.7,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  info: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    marginTop: 2,
  },
  variant: {
    marginTop: 2,
    fontSize: 13,
    color: colors.inkSoft,
  },
  price: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: colors.accentDark,
  },
});
