import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, type, spacing, radius } from '../theme/theme';
import { api } from '../api';
import { addToHistory } from '../utils/history';

const MODES = { BARCODE: 'barcode', PHOTO: 'photo' };

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState(MODES.PHOTO);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const lockRef = useRef(false);
  const cameraRef = useRef(null);
  const insets = useSafeAreaInsets(); // vung tai tho / Dynamic Island / thanh Home cua tung may

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={[type.h1, styles.permTitle]}>Cần quyền dùng camera</Text>
        <Text style={[type.body, styles.permBody]}>
          ScanIt dùng camera để đọc mã vạch và nhận diện sản phẩm bằng ảnh.
        </Text>
        {permission.canAskAgain ? (
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Cho phép camera</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.primaryBtnText}>Mở Cài đặt</Text>
          </Pressable>
        )}
        <Pressable style={styles.linkBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.linkBtnText}>Quay lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Quet duoc ma vach thi luon co phan hoi:
  //   co san pham -> trang chi tiet | khong co -> trang "Không tìm thấy" | loi mang/may chu -> bao loi tai cho
  async function handleBarcodeScanned({ data }) {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const product = await api.findProductByBarcode(data);
      if (product) {
        await addToHistory(product);
        navigation.replace('ProductDetail', { product });
      } else {
        navigation.replace('NotFound', { barcode: data });
      }
    } catch (e) {
      // Loi mang khong phai la "khong co san pham", nen khong chuyen sang trang Not Found.
      // Giu khoa quet cho den khi nguoi dung bam "Quét lại", tranh bao loi lien tuc.
      setError(e.message || 'Không tra được sản phẩm. Thử lại.');
      setBusy(false);
    }
  }

  // Quet bang anh: chup -> gui BE -> (chac chan) mo thang chi tiet | (chua chac) danh sach de chon
  async function handleShutter() {
    if (lockRef.current || !cameraRef.current) return;
    lockRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, skipProcessing: false });
      const result = await api.recognizeImage({ uri: photo.uri, name: 'scan.jpg', type: 'image/jpeg' });
      const top = result.candidates[0];
      if (result.confident && top) {
        const product = await api.getVariant(top.variant.id);
        if (product) {
          await addToHistory(product);
          navigation.replace('ProductDetail', { product });
          return;
        }
      }
      navigation.replace('Candidates', { candidates: result.candidates, scanEventId: result.scanEventId });
    } catch (e) {
      setError(e.message || 'Không nhận diện được ảnh. Thử lại.');
      setBusy(false);
    }
  }

  function retry() {
    setError(null);
    lockRef.current = false;
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
        onBarcodeScanned={mode === MODES.BARCODE ? handleBarcodeScanned : undefined}
      />

      <View
        style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}
        pointerEvents="box-none"
      >
        <View style={styles.topBar}>
          <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
          <View style={styles.modeSwitch}>
            <Pressable
              style={[styles.modeOption, mode === MODES.PHOTO && styles.modeOptionActive]}
              onPress={() => { setMode(MODES.PHOTO); if (!busy) retry(); }}
            >
              <Text style={[styles.modeText, mode === MODES.PHOTO && styles.modeTextActive]}>Ảnh</Text>
            </Pressable>
            <Pressable
              style={[styles.modeOption, mode === MODES.BARCODE && styles.modeOptionActive]}
              onPress={() => { setMode(MODES.BARCODE); if (!busy) retry(); }}
            >
              <Text style={[styles.modeText, mode === MODES.BARCODE && styles.modeTextActive]}>Mã vạch</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.frameWrap}>
          {mode === MODES.BARCODE ? (
            <>
              <View style={styles.frame} />
              <Text style={styles.hint}>Đưa mã vạch vào khung</Text>
            </>
          ) : (
            <Text style={styles.hint}>Đặt cả sản phẩm vào giữa, đủ sáng rồi bấm chụp</Text>
          )}
        </View>

        <View style={styles.bottomBar}>
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={retry}>
                <Text style={styles.retryBtnText}>Quét lại</Text>
              </Pressable>
            </View>
          ) : busy ? (
            <View style={styles.busyPill}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.busyText}>{mode === MODES.PHOTO ? 'Đang nhận diện…' : 'Đang tra sản phẩm…'}</Text>
            </View>
          ) : mode === MODES.PHOTO ? (
            <Pressable style={styles.shutter} onPress={handleShutter} accessibilityLabel="Chụp ảnh">
              <View style={styles.shutterInner} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  permTitle: { color: colors.white, textAlign: 'center' },
  permBody: { color: '#B9C0D0', textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  primaryBtnText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  linkBtn: { marginTop: spacing.md, padding: spacing.sm },
  linkBtnText: { color: '#B9C0D0', fontSize: 14 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(11,18,32,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: colors.white, fontSize: 16 },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11,18,32,0.6)',
    borderRadius: radius.pill,
    padding: 4,
  },
  modeOption: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: radius.pill },
  modeOptionActive: { backgroundColor: colors.accent },
  modeText: { color: '#B9C0D0', fontSize: 13, fontWeight: '600' },
  modeTextActive: { color: colors.ink },
  frameWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
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
    backgroundColor: 'rgba(11,18,32,0.6)',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.white },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 90,
    justifyContent: 'center',
  },
  busyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11,18,32,0.75)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  busyText: { color: colors.white, marginLeft: spacing.sm, fontSize: 13 },
  errorCard: {
    backgroundColor: 'rgba(11,18,32,0.9)',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  errorText: { color: colors.white, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryBtnText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
});
