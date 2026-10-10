import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, type, spacing, radius } from '../theme/theme';
import ProductCard from '../components/ProductCard';
import { getHistory } from '../utils/history';

export default function HomeScreen({ navigation }) {
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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={type.label}>SCANIT</Text>
        <Text style={type.display}>Know what you're{'\n'}picking up.</Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.scanButton,
          pressed && styles.scanButtonPressed,
        ]}
        onPress={() => navigation.navigate('Scanner')}
      >
        <View style={styles.scanIconRing}>
          <View style={styles.scanIconCore} />
        </View>
        <View style={styles.scanTextWrap}>
          <Text style={styles.scanTitle}>Scan a product</Text>
          <Text style={styles.scanSubtitle}>Barcode or camera</Text>
        </View>
      </Pressable>

      <View style={styles.historyHeader}>
        <Text style={type.h2}>Recent scans</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            Nothing scanned yet. Your recent lookups will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id + item.scannedAt}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={(p) => navigation.navigate('ProductDetail', { product: p })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  scanButton: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  scanButtonPressed: {
    opacity: 0.9,
  },
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
  scanTextWrap: {
    flex: 1,
  },
  scanTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  scanSubtitle: {
    color: '#A9B1C3',
    fontSize: 13,
    marginTop: 2,
  },
  historyHeader: {
    marginBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...type.body,
  },
});
