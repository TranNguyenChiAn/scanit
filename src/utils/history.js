import AsyncStorage from '@react-native-async-storage/async-storage';

// v2: du lieu lay tu API that (v1 la du lieu mau, khac cau truc)
const KEY = 'scanit:history:v2';
const MAX_ITEMS = 25;

export async function getHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function addToHistory(product) {
  try {
    const current = await getHistory();
    const withoutDupe = current.filter((p) => p.id !== product.id);
    const updated = [{ ...product, scannedAt: new Date().toISOString() }, ...withoutDupe].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return getHistory();
  }
}

export async function clearHistory() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    // bo qua
  }
}
