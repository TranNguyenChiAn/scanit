// API don hang va bao cao (BE: /api/orders, /api/admin/reports/summary).
import { mapSummary } from './products.js';
import { parseMoney } from './admin.js';

export const PAY_OPTIONS = [
  { value: 'UNPAID', label: 'Chưa trả' },
  { value: 'PARTIAL', label: 'Trả một phần' },
  { value: 'PAID', label: 'Đã trả đủ' },
];
export const PAY_LABEL = { UNPAID: 'Chưa trả', PARTIAL: 'Trả một phần', PAID: 'Đã trả đủ' };
export const STATUS_LABEL = { DRAFT: 'Đơn tạm', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã huỷ' };
export const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Đơn tạm' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

export const EMPTY_ORDER_FORM = { paymentStatus: 'UNPAID', paid: '', discount: '', customerName: '', customerPhone: '', note: '' };

export function orderTotals(items, form) {
  const subtotal = items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
  const discount = parseMoney(form.discount) || 0;
  return { subtotal, discount, total: Math.max(subtotal - discount, 0) };
}

// Thong bao loi dau tien, hoac null neu hop le. Luu don tam cho phep don rong; chot don thi khong.
export function validateOrder(items, form, { confirm = true } = {}) {
  if (confirm && !items.length) return 'Đơn chưa có sản phẩm.';
  const noPrice = items.find((i) => i.price === null || i.price === undefined);
  if (noPrice) return `${noPrice.name} chưa có giá bán. Nhờ quản lý cài giá.`;
  const { subtotal, discount, total } = orderTotals(items, form);
  if (discount > subtotal) return 'Giảm giá lớn hơn tổng tiền hàng.';
  if (form.paymentStatus === 'PARTIAL') {
    const paid = parseMoney(form.paid);
    if (!paid || paid <= 0 || paid >= total) return 'Trả một phần: nhập số tiền đã trả, nhỏ hơn tổng đơn.';
  }
  return null;
}

// canPrice: chi nguoi co quyen order.price moi gui gia tung dong; con lai may chu tu lay theo bang gia.
export function buildOrderRequest(items, form, { canPrice = false, confirm = false } = {}) {
  return {
    items: items.map((i) => ({ variantId: i.id, quantity: i.quantity, unitPrice: canPrice ? i.price : undefined })),
    discount: parseMoney(form.discount) || 0,
    paymentStatus: form.paymentStatus,
    paidAmount: form.paymentStatus === 'PARTIAL' ? parseMoney(form.paid) : null,
    customerName: form.customerName?.trim() || null,
    customerPhone: form.customerPhone?.trim() || null,
    note: form.note?.trim() || null,
    confirm,
  };
}

export function mapOrder(d) {
  return {
    id: d.id, code: d.code, status: d.status, paymentStatus: d.paymentStatus,
    subtotal: d.subtotal, discount: d.discount, total: d.total, paid: d.paid, owed: d.owed,
    customerName: d.customerName || null, customerPhone: d.customerPhone || null, note: d.note || null,
    staffName: d.staffName, orderedAt: d.orderedAt, itemCount: d.itemCount,
    items: (d.items || []).map((i) => ({
      variantId: i.variantId, sku: i.sku, name: i.productName, color: i.color, size: i.size,
      quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal, costPrice: i.costPrice ?? null, stock: i.stock ?? 0,
    })),
    profit: d.profit ?? null, // chi co voi nguoi xem duoc bao cao
  };
}

export async function createOrder(http, payload) {
  return mapOrder(await http.post('/api/orders', payload));
}

// Luu don tam da co (thay het noi dung). payload.confirm = true thi chot luon.
export async function saveOrder(http, id, payload) {
  return mapOrder(await http.put(`/api/orders/${encodeURIComponent(id)}`, payload));
}

export async function confirmOrder(http, id) {
  return mapOrder(await http.post(`/api/orders/${encodeURIComponent(id)}/confirm`, {}));
}

export async function deleteOrder(http, id) {
  await http.del(`/api/orders/${encodeURIComponent(id)}`);
}

export async function getOrder(http, id) {
  return mapOrder(await http.get(`/api/orders/${encodeURIComponent(id)}`));
}

export async function listOrders(http, { q = '', status = '', payment = '', page = 0, size = 30 } = {}) {
  const r = await http.get('/api/orders', { q, status, payment, page, size });
  return { items: r.items || [], total: r.total ?? 0, page: r.page ?? page, size: r.size ?? size };
}

export async function updatePayment(http, id, { paymentStatus, paidAmount }) {
  return mapOrder(await http.patch(`/api/orders/${encodeURIComponent(id)}/payment`, { paymentStatus, paidAmount: paidAmount ?? null }));
}

export async function cancelOrder(http, id) {
  return mapOrder(await http.post(`/api/orders/${encodeURIComponent(id)}/cancel`, {}));
}

// Tim san pham de them vao don (BE: GET /api/variants?q=)
export async function searchVariants(http, q) {
  const r = await http.get('/api/variants', { q: q.trim(), size: 30 });
  const base = await http.baseUrl();
  return (r?.items || []).map((d) => mapSummary(d, base));
}

export async function getReport(http, { from, to }) {
  return http.get('/api/admin/reports/summary', { from, to });
}

// ---- khoang ngay cho bao cao (theo gio may), dang yyyy-MM-dd
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const REPORT_RANGES = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: 'month', label: 'Tháng này' },
  { value: '30d', label: '30 ngày' },
];

export function reportRange(kind, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  if (kind === '7d') start.setDate(start.getDate() - 6);
  else if (kind === '30d') start.setDate(start.getDate() - 29);
  else if (kind === 'month') start.setDate(1);
  return { from: ymd(start), to: ymd(end) };
}
