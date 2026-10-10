import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { colors, type, spacing, radius } from '../theme/theme';
import { formatPrice, imageSource } from '../utils/format';

export default function ProductCard({ product, onPress }) {
  return (
    <Pressable
      onPress={() => onPress?.(product)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Image source={imageSource(product.image)} style={styles.thumb} />
      <View style={styles.info}>
        <Text style={type.label}>{product.category.toUpperCase()}</Text>
        <Text style={[type.h2, styles.name]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatPrice(product)}</Text>
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
    backgroundColor: colors.background,
  },
  info: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    marginTop: 2,
  },
  price: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: colors.accentDark,
  },
});
