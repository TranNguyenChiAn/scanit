import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, type, spacing, radius } from '../theme/theme';
import ProductCard from '../components/ProductCard';
import { getHistory } from '../utils/history';
import { useAuth } from '../auth/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [history, setHistory] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getHistory().then((items) => {
        if (active) setHistory(items);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  function confirmSignOut() {
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi tài khoản này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topRow}>
        <View style={styles.flex}>
          <Text style={type.label}>Xin chào</Text>
          <Text style={type.h1} numberOfLines={1}>
            {user?.fullName}
          </Text>
        </View>
        <Pressable onPress={confirmSignOut} hitSlop={12}>
          <Text style={styles.signOut}>Đăng xuất</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
        onPress={() => navigation.navigate('Scanner')}
      >
        <View style={styles.scanIconRing}>
          <View style={styles.scanIconCore} />
        </View>
        <View style={styles.scanTextWrap}>
          <Text style={styles.scanTitle}>Quét sản phẩm</Text>
          <Text style={styles.scanSubtitle}>Chụp ảnh hoặc quét mã vạch</Text>
        </View>
      </Pressable>

      {user?.permissions?.includes('product.manage') ? (
        <Pressable
          style={({ pressed }) => [styles.manageButton, pressed && styles.scanButtonPressed]}
          onPress={() => navigation.navigate('AdminProducts')}
        >
          <Text style={styles.manageTitle}>Quản lý sản phẩm</Text>
          <Text style={styles.manageSub}>Thêm, sửa, xoá sản phẩm, giá, tồn kho và ảnh</Text>
        </Pressable>
      ) : null}

      <View style={styles.historyHeader}>
        <Text style={type.h2}>Quét gần đây</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Chưa quét sản phẩm nào. Các sản phẩm bạn vừa tra sẽ hiện ở đây.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={(p) => navigation.navigate('ProductDetail', { product: p })} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  signOut: {
    color: colors.inkSoft,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
  scanButton: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  scanButtonPressed: { opacity: 0.9 },
  scanIconRing: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  scanIconCore: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  scanTextWrap: { flex: 1 },
  scanTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  scanSubtitle: { color: '#A9B1C3', fontSize: 13, marginTop: 2 },
  manageButton: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginTop: -spacing.md,
    marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border,
  },
  manageTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  manageSub: { fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  historyHeader: { marginBottom: spacing.sm },
  list: { paddingBottom: spacing.xl },
  emptyWrap: { paddingVertical: spacing.lg },
  emptyText: { ...type.body },
});
