import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme/theme';

// Thong bao ngan o dau man hinh, tu an sau ~2.5s. Truyen message moi de hien lai.
export default function Toast({ message, onHide }) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!message) return undefined;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onHide?.());
    }, 2500);
    return () => clearTimeout(t);
  }, [message, opacity, onHide]);
  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity, top: insets.top + 16 }]}>
      <Text style={styles.text}>✓ {message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', top: 8, left: spacing.md, right: spacing.md, zIndex: 10, backgroundColor: colors.ink,
    borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.md,
  },
  text: { color: colors.white, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
