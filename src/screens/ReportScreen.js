import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme/theme';
import { orders, REPORT_RANGES, reportRange } from '../api';
import { formatPrice } from '../utils/format';
import { Card, Chips, Header } from '../components/FormBits';

const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function Tile({ label, value, color, wide }) {
  return (
    <View style={[styles.tile, wide && styles.tileWide]}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, color && { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

// Bao cao cho admin: doanh thu, gia von, lai gop (am = lo), cong no chua thu, theo ngay va san pham ban chay.
export default function ReportScreen({ navigation }) {
  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    orders.report(reportRange(range))
      .then((r) => alive && setData(r))
      .catch((e) => alive && setError(e.message || 'Không tải được báo cáo.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [range, tick]);

  const maxRevenue = data ? Math.max(1, ...data.daily.map((d) => d.revenue)) : 1;
  const profitColor = data && data.profit < 0 ? colors.danger : colors.accentDark;
  const activeDays = data ? data.daily.filter((d) => d.orders > 0) : [];

  return (
    <SafeAreaView style={styles.screen}>
      <Header title="Báo cáo" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Chips options={REPORT_RANGES} value={range} onChange={setRange} />
        {error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => setTick((t) => t + 1)} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable>
          </View>
        ) : loading && !data ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} />
        ) : data ? (
          <>
            <Text style={styles.range}>{dm(data.from)} – {dm(data.to)} · {data.orders} đơn · {data.itemsSold} món</Text>
            <View style={styles.grid}>
              <Tile label="Doanh thu" value={formatPrice(data.revenue)} wide />
              <Tile label="Giá vốn" value={formatPrice(data.cogs)} />
              <Tile label={data.profit < 0 ? 'Lỗ gộp' : 'Lãi gộp'} value={formatPrice(data.profit)} color={profitColor} />
              <Tile label="Biên lãi" value={`${data.marginPct}%`} color={profitColor} />
              <Tile label="Chưa thu" value={formatPrice(data.unpaid)} color={data.unpaid > 0 ? colors.warn : undefined} />
            </View>
            <Text style={styles.note}>Lãi gộp = doanh thu (sau giảm giá) − giá vốn. Chưa trừ chi phí vận hành như thuê mặt bằng, lương.</Text>

            <Card title="Doanh thu theo ngày">
              <View style={styles.bars}>
                {data.daily.map((d) => (
                  <View key={d.date} style={styles.barCol}>
                    <View style={[styles.bar, { height: Math.max(2, Math.round((d.revenue / maxRevenue) * 90)) }, d.profit < 0 && { backgroundColor: colors.danger }]} />
                  </View>
                ))}
              </View>
              <View style={styles.axis}>
                <Text style={styles.axisText}>{dm(data.from)}</Text>
                <Text style={styles.axisText}>{dm(data.to)}</Text>
              </View>
              <Text style={styles.legend}>Cột đỏ: ngày bán lỗ</Text>
            </Card>

            <Card title="Chi tiết các ngày có đơn">
              {activeDays.length === 0 ? <Text style={styles.empty}>Chưa có đơn trong khoảng này.</Text> : null}
              {[...activeDays].reverse().map((d) => (
                <View key={d.date} style={styles.dayRow}>
                  <Text style={styles.dayDate}>{dm(d.date)}</Text>
                  <Text style={styles.dayOrders}>{d.orders} đơn</Text>
                  <Text style={styles.dayRevenue}>{formatPrice(d.revenue)}</Text>
                  <Text style={[styles.dayProfit, { color: d.profit < 0 ? colors.danger : colors.accentDark }]}>{formatPrice(d.profit)}</Text>
                </View>
              ))}
            </Card>

            <Card title="Bán chạy" subtitle="Lãi từng sản phẩm chưa trừ giảm giá cả đơn">
              {data.top.length === 0 ? <Text style={styles.empty}>Chưa có dữ liệu.</Text> : null}
              {data.top.map((p) => (
                <View key={p.productId} style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.topSub}>{p.quantity} món · {formatPrice(p.revenue)}</Text>
                  </View>
                  <Text style={[styles.dayProfit, { color: p.profit < 0 ? colors.danger : colors.accentDark }]}>{formatPrice(p.profit)}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { alignItems: 'center', padding: spacing.lg },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  retry: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.ink },
  retryText: { color: colors.white, fontWeight: '700' },
  range: { fontSize: 13, color: colors.inkSoft, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '48.5%', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  tileWide: { width: '100%' },
  tileLabel: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  tileValue: { fontSize: 22, fontWeight: '700', color: colors.ink, marginTop: 4 },
  note: { fontSize: 12, color: colors.inkSoft, marginVertical: spacing.md },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 2 },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  bar: { backgroundColor: colors.accent, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisText: { fontSize: 11, color: colors.inkSoft },
  legend: { fontSize: 11, color: colors.inkSoft, marginTop: 4 },
  empty: { color: colors.inkSoft, fontSize: 14 },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  dayDate: { width: 48, fontSize: 13, fontWeight: '600', color: colors.ink },
  dayOrders: { width: 56, fontSize: 12, color: colors.inkSoft },
  dayRevenue: { flex: 1, textAlign: 'right', fontSize: 13, color: colors.ink },
  dayProfit: { minWidth: 92, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  topName: { fontSize: 14, fontWeight: '600', color: colors.ink },
  topSub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
});
