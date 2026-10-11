// API quan tri san pham (BE: /api/admin/*, can quyen product.manage).
import { resolveUrl } from './products.js';

// "490.000" / "490000đ" -> 490000; rong -> null
export function parseMoney(v) {
  const digits = String(v ?? '').replace(/[^\d]/g, '');
  return digits === '' ? null : Number(digits);
}

export function parseCount(v) {
  const n = parseMoney(v);
  return n === null ? null : n;
}

export const splitList = (s) =>
  String(s || '')
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

export const EMPTY_PRODUCT = {
  styleCode: '', name: '', description: '', brand: '', material: '', season: '',
  productType: 'SINGLE', components: '', categories: '', status: 'ACTIVE',
};

// Thong bao loi dau tien, hoac null neu hop le
export function validateProduct(f) {
  if (!f.styleCode?.trim()) return 'Nhập mã mẫu (ví dụ 8922).';
  if (!f.name?.trim()) return 'Nhập tên sản phẩm.';
  return null;
}

export function buildProductRequest(f) {
  return {
    styleCode: f.styleCode.trim(),
    name: f.name.trim(),
    description: f.description?.trim() || null,
    brand: f.brand?.trim() || null,
    material: f.material?.trim() || null,
    season: f.season?.trim() || null,
    productType: f.productType || 'SINGLE',
    components: splitList(f.components),
    categories: splitList(f.categories),
    status: f.status || 'ACTIVE',
  };
}

export function productToForm(p) {
  return {
    styleCode: p.styleCode || '', name: p.name || '', description: p.description || '', brand: p.brand || '',
    material: p.material || '', season: p.season || '', productType: p.productType || 'SINGLE',
    components: (p.components || []).join(', '), categories: (p.categories || []).join(', '),
    status: p.status || 'ACTIVE',
  };
}

export const EMPTY_VARIANT = {
  color: '', size: '', sku: '', barcode: '', cost: '', retail: '', wholesale: '', minQuantity: '', quantity: '', note: '',
};

export function validateVariant(f, { creating }) {
  if (creating && !f.color?.trim()) return 'Nhập màu.';
  if (creating && !f.size?.trim()) return 'Nhập size (hoặc "Free size").';
  return null;
}

function priceList(f, keep = []) {
  const out = [...keep];
  const retail = parseMoney(f.retail);
  const wholesale = parseMoney(f.wholesale);
  if (retail !== null) out.push({ type: 'RETAIL', minQty: 1, price: retail });
  if (wholesale !== null) out.push({ type: 'WHOLESALE', minQty: 1, price: wholesale });
  return out;
}

export function buildVariantCreate(f) {
  return {
    color: f.color.trim(),
    size: f.size.trim(),
    sku: f.sku?.trim() || null,
    barcode: f.barcode?.trim() || null,
    costPrice: parseMoney(f.cost) ?? 0,
    prices: priceList(f),
    quantity: parseCount(f.quantity) ?? 0,
    minQuantity: parseCount(f.minQuantity) ?? 0,
    note: f.note?.trim() || null,
  };
}

// Sua: khong doi mau/size. Giu nguyen cac bac gia theo so luong (minQty > 1) ma man hinh khong chinh.
export function buildVariantUpdate(f, existing) {
  const keep = (existing?.prices || []).filter((p) => p.minQty > 1);
  return {
    sku: f.sku?.trim() || null,
    barcode: f.barcode?.trim() || '', // rong = BE tu sinh ma moi
    costPrice: parseMoney(f.cost) ?? 0,
    prices: priceList(f, keep),
    minQuantity: parseCount(f.minQuantity) ?? 0,
    note: f.note?.trim() ?? '', // rong = xoa ghi chu
  };
}

export function variantToForm(v) {
  const price = (type) => v.prices?.find((p) => p.type === type && p.minQty === 1)?.price;
  const str = (n) => (n === undefined || n === null ? '' : String(n));
  return {
    color: v.color?.name || '', size: v.size?.name || '', sku: v.sku || '', barcode: v.barcode || '',
    cost: str(v.costPrice), retail: str(price('RETAIL')), wholesale: str(price('WHOLESALE')),
    minQuantity: str(v.minQuantity), quantity: '', note: v.note || '',
  };
}

function mapProduct(p, baseUrl) {
  return {
    ...p,
    media: (p.media || []).map((m) => ({ ...m, url: resolveUrl(m.url, baseUrl), thumbUrl: resolveUrl(m.thumbUrl, baseUrl) })),
  };
}

export async function listProducts(http, { q = '', status = '', page = 0, size = 30 } = {}) {
  const r = await http.get('/api/admin/products', { q, status, page, size });
  const baseUrl = await http.baseUrl();
  return { ...r, items: (r.items || []).map((i) => ({ ...i, image: resolveUrl(i.image, baseUrl) })) };
}

export async function getProduct(http, id) {
  return mapProduct(await http.get(`/api/admin/products/${id}`), await http.baseUrl());
}

// Tao san pham cung luc voi cac bien the (BE tao trong 1 giao dich: hoac du hoac khong co gi)
export function buildProductCreate(form, variantForms = []) {
  return { ...buildProductRequest(form), variants: variantForms.map(buildVariantCreate) };
}

export async function createProduct(http, form, variantForms = []) {
  return mapProduct(await http.post('/api/admin/products', buildProductCreate(form, variantForms)), await http.baseUrl());
}

// Sinh bien the hang loat: moi to hop mau x size la 1 bien the, dung chung gia/ghi chu.
// colors/sizes: chuoi ngan cach dau phay hoac mang. existing: cac bien the da co (form hoac {color,size}) de bo qua trung.
export function generateVariants({ colors, sizes, retail = '', wholesale = '', cost = '', note = '', existing = [] }) {
  const list = (v) => (Array.isArray(v) ? v : splitList(v)).map((x) => String(x).trim()).filter(Boolean);
  const dedupe = (arr) => {
    const seen = new Set();
    return arr.filter((x) => (seen.has(x.toLowerCase()) ? false : seen.add(x.toLowerCase())));
  };
  const cs = dedupe(list(colors));
  const ss = dedupe(list(sizes));
  const key = (c, s) => `${c.trim().toLowerCase()}|${s.trim().toLowerCase()}`;
  const have = new Set(existing.map((e) => key(e.color?.name ?? e.color ?? '', e.size?.name ?? e.size ?? '')));
  const out = [];
  let skipped = 0;
  for (const c of cs) {
    for (const s of ss) {
      if (have.has(key(c, s))) { skipped += 1; continue; }
      out.push({ ...EMPTY_VARIANT, color: c, size: s, retail, wholesale, cost, note });
    }
  }
  return { variants: out, skipped };
}

export async function updateProduct(http, id, form) {
  return mapProduct(await http.put(`/api/admin/products/${id}`, buildProductRequest(form)), await http.baseUrl());
}

export const deleteProduct = (http, id) => http.del(`/api/admin/products/${id}`);

export async function addVariant(http, productId, form) {
  return mapProduct(await http.post(`/api/admin/products/${productId}/variants`, buildVariantCreate(form)), await http.baseUrl());
}

export async function updateVariant(http, variant, form) {
  return mapProduct(await http.put(`/api/admin/variants/${variant.id}`, buildVariantUpdate(form, variant)), await http.baseUrl());
}

export async function deleteVariant(http, id) {
  return mapProduct(await http.del(`/api/admin/variants/${id}`), await http.baseUrl());
}

// mode: 'add' (nhap them), 'remove' (xuat bot), 'set' (kiem kho: dat dung bang so nay)
export function buildStockRequest(mode, amount, note) {
  const n = parseCount(amount);
  if (n === null) throw new Error('Nhập số lượng.');
  if (mode !== 'set' && n === 0) throw new Error('Số lượng phải lớn hơn 0.');
  const body = mode === 'set' ? { setTo: n, type: 'ADJUSTMENT' } : { delta: mode === 'remove' ? -n : n, type: mode === 'add' ? 'PURCHASE' : 'ADJUSTMENT' };
  if (note?.trim()) body.note = note.trim();
  return body;
}

export const adjustStock = (http, variantId, body) => http.post(`/api/admin/variants/${variantId}/stock`, body);

// file: { uri, name, type } (React Native) hoac Blob (thu bang Node)
export async function uploadPhoto(http, productId, file, colorId) {
  const form = new FormData();
  form.append('file', file);
  if (colorId) form.append('colorId', String(colorId));
  const m = await http.postForm(`/api/admin/products/${productId}/media`, form, { timeoutMs: 60000 });
  const baseUrl = await http.baseUrl();
  return { ...m, url: resolveUrl(m.url, baseUrl), thumbUrl: resolveUrl(m.thumbUrl, baseUrl) };
}

export const deletePhoto = (http, productId, mediaId) => http.del(`/api/admin/products/${productId}/media/${mediaId}`);
export const setPrimaryPhoto = (http, productId, mediaId) =>
  http.patch(`/api/admin/products/${productId}/media/${mediaId}`, { primary: true });

export const listColors = (http) => http.get('/api/admin/colors');
