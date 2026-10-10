import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, type, spacing, radius } from '../theme/theme';
import { lookupByBarcode } from '../data/products';
import { recognizeProductFromImage } from '../data/recognizeProduct';
import { addToHistory } from '../utils/history';

const MODES = { BARCODE: 'barcode', PHOTO: 'photo' };

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState(MODES.BARCODE);
  const [busy, setBusy] = useState(false);
  const lockRef = useRef(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={[type.h1, styles.permTitle]}>Camera access needed</Text>
        <Text style={[type.body, styles.permBody]}>
          ScanIt uses the camera to read barcodes and recognize products.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Allow camera</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Barcode found -> always surface a result: detail page on match,
  // Not Found screen on miss. This path must always respond.
  async function handleBarcodeScanned({ data }) {
    if (lockRef.current || busy) return;
    lockRef.current = true;
    setBusy(true);
    try {
      const product = await lookupByBarcode(data);
      if (product) {
        await addToHistory(product);
        navigation.replace('ProductDetail', { product });
      } else {
        navigation.replace('NotFound', { barcode: data });
      }
    } finally {
      setBusy(false);
      setTimeout(() => {
        lockRef.current = false;
      }, 1000);
    }
  }

  // Photo recognition miss is ignored: camera just stays open, no
  // Not Found screen and no error surfaced, since a single snapshot
  // guess isn't confident enough to interrupt the user.
  async function handleCapture() {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.4 });
      const product = await recognizeProductFromImage(photo.uri);
      if (product) {
        await addToHistory(product);
        navigation.replace('ProductDetail', { product });
      }
      // else: silently ignore, remain on the scanner
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={
          mode === MODES.BARCODE
            ? {
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                  'qr',
                ],
              }
            : undefined
        }
        onBarcodeScanned={
          mode === MODES.BARCODE ? handleBarcodeScanned : undefined
        }
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
          <View style={styles.modeSwitch}>
            <Pressable
              style={[
                styles.modeOption,
                mode === MODES.BARCODE && styles.modeOptionActive,
              ]}
              onPress={() => setMode(MODES.BARCODE)}
            >
              <Text
                style={[
                  styles.modeText,
                  mode === MODES.BARCODE && styles.modeTextActive,
                ]}
              >
                Barcode
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeOption,
                mode === MODES.PHOTO && styles.modeOptionActive,
              ]}
              onPress={() => setMode(MODES.PHOTO)}
            >
              <Text
                style={[
                  styles.modeText,
                  mode === MODES.PHOTO && styles.modeTextActive,
                ]}
              >
                Photo
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame} />
          <Text style={styles.hint}>
            {mode === MODES.BARCODE
              ? 'Point at a barcode'
              : 'Frame the product, then tap to identify'}
          </Text>
        </View>

        <View style={styles.bottomBar}>
          {mode === MODES.PHOTO ? (
            <Pressable
              style={styles.shutter}
              onPress={handleCapture}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </Pressable>
          ) : busy ? (
            <View style={styles.busyPill}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.busyText}>Looking it up…</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permTitle: {
    color: colors.white,
    textAlign: 'center',
  },
  permBody: {
    color: '#B9C0D0',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  primaryBtnText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(11,18,32,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.white,
    fontSize: 16,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11,18,32,0.6)',
    borderRadius: radius.pill,
    padding: 4,
  },
  modeOption: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  modeOptionActive: {
    backgroundColor: colors.accent,
  },
  modeText: {
    color: '#B9C0D0',
    fontSize: 13,
    fontWeight: '600',
  },
  modeTextActive: {
    color: colors.ink,
  },
  frameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 260,
    height: 170,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  hint: {
    color: colors.white,
    marginTop: spacing.md,
    fontSize: 14,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    minHeight: 90,
    justifyContent: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  busyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11,18,32,0.75)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  busyText: {
    color: colors.white,
    marginLeft: spacing.sm,
    fontSize: 13,
  },
});
