// Don tam dang soan tren man hinh (giu trong bo nho). Chua luu len may chu cho den khi bam "Luu don tam" / "Chot don".
// Khong phu thuoc React nen thu duoc bang Node.
// Moi dong: { id (variantId, chuoi), name, color, size, sku, price (so hoac null), stock, image, quantity }
import { EMPTY_ORDER_FORM } from '../api/orders.js';

const fresh = () => ({ orderId: null, code: null, items: [], form: { ...EMPTY_ORDER_FORM }, dirty: false });

let state = fresh();
const listeners = new Set();

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Tra ve cung mot doi tuong cho den khi don tam thay doi (useSyncExternalStore can dieu nay)
export function getDraft() {
  return state;
}

export function startNew() {
  set(fresh());
}

export const clearDraft = startNew;

export function itemCount(items = state.items) {
  return items.reduce((n, i) => n + i.quantity, 0);
}

// Nap don tam lay tu may chu (sau khi luu hoac khi mo lai tu danh sach)
export function loadFromOrder(order) {
  set({
    orderId: order.id,
    code: order.code,
    dirty: false,
    items: order.items.map((i) => ({
      id: i.variantId, name: i.name, color: i.color, size: i.size, sku: i.sku, price: i.unitPrice, stock: i.stock ?? 0,
      image: null, quantity: i.quantity,
    })),
    form: {
      paymentStatus: order.paymentStatus || 'UNPAID',
      paid: order.paymentStatus === 'PARTIAL' ? String(order.paid) : '',
      discount: order.discount ? String(order.discount) : '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      note: order.note || '',
    },
  });
}

// Them 1 san pham (hoac tang so luong neu da co). Tra ve { ok, reason?, quantity?, stock? }
export function addItem(item, qty = 1) {
  const stock = Number(item.stock) || 0;
  if (stock <= 0) return { ok: false, reason: 'out' };
  const found = state.items.find((i) => i.id === item.id);
  const next = (found ? found.quantity : 0) + qty;
  if (next > stock) return { ok: false, reason: 'stock', stock };
  const items = found
    ? state.items.map((i) => (i.id === item.id ? { ...i, quantity: next, stock } : i))
    : [...state.items, { ...item, price: item.price || null, quantity: qty }];
  set({ items, dirty: true });
  return { ok: true, quantity: next };
}

export function setQuantity(id, quantity) {
  const q = Math.max(1, Math.floor(Number(quantity) || 1));
  set({ items: state.items.map((i) => (i.id === id ? { ...i, quantity: i.stock > 0 ? Math.min(q, i.stock) : q } : i)), dirty: true });
}

export function setPrice(id, price) {
  const value = price === null || price === undefined ? null : Math.max(0, Number(price) || 0);
  set({ items: state.items.map((i) => (i.id === id ? { ...i, price: value } : i)), dirty: true });
}

export function removeItem(id) {
  set({ items: state.items.filter((i) => i.id !== id), dirty: true });
}

export function setForm(patch) {
  set({ form: { ...state.form, ...patch }, dirty: true });
}

// Chuyen du lieu man hinh khac thanh dong cua don tam
export function itemFromProduct(p) {
  const attr = (name) => p.attributes?.find((a) => a.name === name)?.value || null;
  return { id: p.id, name: p.name, color: attr('Màu sắc'), size: attr('Kích cỡ'), sku: p.sku, price: p.price || null, stock: p.quantity, image: p.image };
}

export function itemFromSummary(s) {
  return { id: s.id, name: s.name, color: s.color, size: s.size, sku: s.sku, price: s.price || null, stock: s.quantity, image: s.image };
}

export const stockMessage = (r) =>
  r.reason === 'out' ? 'Sản phẩm đã hết hàng.' : `Chỉ còn ${r.stock} sản phẩm trong kho.`;
