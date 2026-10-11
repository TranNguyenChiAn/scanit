import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Token dang nhap la du lieu nhay cam -> luu o SecureStore (Keychain tren iOS, Keystore tren Android).
// Dia chi may chu va thong tin hien thi khong nhay cam -> AsyncStorage.
const TOKEN_KEY = 'scanit.token';
const USER_KEY = 'scanit:user';
const SERVER_KEY = 'scanit:serverUrl';

const DEFAULT_SERVER = process.env.EXPO_PUBLIC_API_URL || '';

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getServerUrl() {
  try {
    return (await AsyncStorage.getItem(SERVER_KEY)) || DEFAULT_SERVER;
  } catch {
    return DEFAULT_SERVER;
  }
}

export async function saveServerUrl(url) {
  await AsyncStorage.setItem(SERVER_KEY, url);
}

export async function loadSession() {
  try {
    const [token, rawUser] = await Promise.all([getToken(), AsyncStorage.getItem(USER_KEY)]);
    if (!token || !rawUser) return null;
    return { token, user: JSON.parse(rawUser) };
  } catch {
    return null;
  }
}

export async function saveSession({ token, user }) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // khong co token de xoa
  }
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch {
    // bo qua
  }
}
