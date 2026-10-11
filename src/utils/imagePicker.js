import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Chon anh tu thu vien (nhieu anh) hoac chup moi. Tra ve [{ uri }] hoac [] neu huy / khong co quyen.
// Anh duoc nen o may (chat luong 0.8), backend nen tiep thanh WebP.
export async function pickPhotos(source) {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Cần quyền truy cập', 'Hãy cho phép trong Cài đặt để thêm ảnh.');
    return [];
  }
  const opts = { mediaTypes: ['images'], quality: 0.8 };
  const res = source === 'camera'
    ? await ImagePicker.launchCameraAsync(opts)
    : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: 6 });
  if (res.canceled || !res.assets?.length) return [];
  return res.assets.map((a) => ({ uri: a.uri }));
}
