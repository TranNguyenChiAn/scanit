import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../theme/theme';
import { imageSource } from '../utils/format';

// Hien anh san pham; chua co anh hoac anh loi thi hien o trong thay vi de trong.
export default function ProductImage({ url, width = 800, style, compact = false }) {
  const [failed, setFailed] = useState(false);
  const source = imageSource(url, width);

  if (!source || failed) {
    return (
      <View style={[styles.empty, style]}>
        {compact ? null : <Text style={[type.label, styles.emptyText]}>Chưa có ảnh</Text>}
      </View>
    );
  }
  return <Image source={source} style={style} resizeMode="cover" onError={() => setFailed(true)} />;
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.inkSoft,
  },
});
