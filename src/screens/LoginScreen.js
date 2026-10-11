import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, type, spacing, radius } from '../theme/theme';
import { useAuth } from '../auth/AuthContext';
import { getServerUrl } from '../storage/session';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [serverUrl, setServerUrl] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const passwordRef = useRef(null);

  // Dien san dia chi may chu da dung lan truoc
  useEffect(() => {
    getServerUrl().then((url) => url && setServerUrl(url));
  }, []);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn({ serverUrl, account, password });
    } catch (e) {
      setError(e.message || 'Đăng nhập thất bại. Thử lại.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={type.display}>Đăng nhập</Text>
          <Text style={[type.body, styles.lead]}>Dùng tài khoản nhân viên do quản lý cấp.</Text>

          <Text style={styles.label}>Địa chỉ máy chủ</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="192.168.1.20:8080"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Text style={styles.label}>Số điện thoại, email hoặc tên đăng nhập</Text>
          <TextInput
            style={styles.input}
            value={account}
            onChangeText={setAccount}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            returnKeyType="next"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonPressed]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
          </Pressable>

          <View style={styles.hintBox}>
            <Text style={styles.hint}>
              Điện thoại và máy chạy máy chủ phải cùng mạng Wi-Fi. Không dùng "localhost": trên điện thoại,
              đó là chính điện thoại.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  lead: { marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { ...type.label, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  hintBox: { marginTop: spacing.lg },
  hint: { fontSize: 13, color: colors.inkSoft, lineHeight: 19 },
});
