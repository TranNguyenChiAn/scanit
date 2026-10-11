import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, radius } from '../theme/theme';

export function Field({ label, hint, error, style, ...input }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, input.multiline && styles.multiline, error && styles.inputError]}
        placeholderTextColor="#9AA2B1"
        autoCorrect={false}
        {...input}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// Khoi noi dung co tieu de, de chia form dai thanh tung phan de nhin
export function Card({ title, subtitle, action, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{title}</Text>
            {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// Phan co the thu gon, mac dinh dong: giu form gon, chi mo khi can
export function Collapsible({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <View style={styles.card}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.cardHead} hitSlop={6}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle && !open ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
        </View>
        <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? <View style={{ marginTop: spacing.md }}>{children}</View> : null}
    </View>
  );
}

// Thanh luu co dinh o day man hinh: luon thay, khong phai cuon xuong de tim nut
export function SaveBar({ title, onPress, busy, disabled, note }) {
  return (
    <View style={styles.saveBar}>
      {note ? <Text style={styles.saveNote}>{note}</Text> : null}
      <Button title={title} onPress={onPress} busy={busy} disabled={disabled} />
    </View>
  );
}

// Hang lua chon dang chip. options: [{ value, label }]
export function Chips({ label, options, value, onChange }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chipRow}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary', busy, disabled, style }) {
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={[styles.btn, kind === 'primary' && styles.btnPrimary, kind === 'secondary' && styles.btnSecondary,
        kind === 'danger' && styles.btnDanger, off && { opacity: 0.55 }, style]}
    >
      {busy ? (
        <ActivityIndicator color={kind === 'primary' ? colors.ink : colors.inkSoft} />
      ) : (
        <Text style={[styles.btnText, kind === 'primary' && { color: colors.ink }, kind === 'danger' && { color: colors.danger }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Header({ title, onBack, right }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>‹ Quay lại</Text>
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function Section({ title, children, action }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.inkSoft, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15, color: colors.ink,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  errorText: { fontSize: 12, color: colors.danger, marginTop: 4 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  cardSub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  chevron: { fontSize: 16, color: colors.inkSoft, paddingHorizontal: 6 },
  saveBar: {
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, backgroundColor: colors.background,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  saveNote: { fontSize: 12, color: colors.inkSoft, textAlign: 'center', marginBottom: 6 },
  hint: { fontSize: 12, color: '#7A8396', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  btn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.pill, minHeight: 48 },
  btnPrimary: { backgroundColor: colors.accent },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnDanger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
  btnText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  back: { minWidth: 80 },
  backText: { fontSize: 15, color: colors.accentDark, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.ink },
  headerRight: { minWidth: 80, alignItems: 'flex-end' },
  section: { marginTop: spacing.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
});
