import { ApiError } from './http.js';

// Tra san pham theo ma vach: GET /api/variants/by-barcode/{ma}
// BE tim chinh xac (da xu ly UPC-A / EAN-13 so 0 dau), tra 404 neu khong co.
export async function findProductByBarcode(http, barcode) {
  const code = (barcode || '').trim();
  if (!code) return null;
  try {
    const dto = await http.get(`/api/variants/by-barcode/${encodeURIComponent(code)}`);
    return dto ? mapVariant(dto, await http.baseUrl()) : null;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

// Lay chi tiet theo id (dung khi nhan vien chon mot ung vien tu ket qua quet anh).
export async function getVariantById(http, id) {
  const dto = await http.get(`/api/variants/${encodeURIComponent(id)}`);
  return dto ? mapVariant(dto, await http.baseUrl()) : null;
}

// BE tra anh he thong tu luu dang tuong doi ("/media/m/<sha>.webp"): ghep voi dia chi may chu.
export function resolveUrl(url, baseUrl) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Dong tom tat trong ket qua quet anh (VariantSummary cua BE)
export function mapSummary(dto, baseUrl) {
  return {
    id: dto.id,
    name: dto.productName || 'Sản phẩm',
    color: dto.color || null,
    size: dto.size || null,
    sku: dto.sku || null,
    price: dto.retailPrice ?? null,
    quantity: dto.quantity ?? 0,
    image: resolveUrl(dto.image, baseUrl),
    note: dto.note || null,
  };
}

const PRICE_LABEL = { RETAIL: 'Giá lẻ', WHOLESALE: 'Giá sỉ' };

// Chuyen DTO cua BE sang dang ma man hinh dung.
// Co y KHONG lay costPrice (gia von) ra khoi lop nay.
export function mapVariant(dto, baseUrl = null) {
  const product = dto.product || {};
  const images = Array.isArray(dto.images) ? dto.images.map((u) => resolveUrl(u, baseUrl)).filter(Boolean) : [];

  const prices = (dto.prices || []).map((p) => ({
    type: p.type,
    minQty: p.minQty,
    price: p.price,
    label: `${PRICE_LABEL[p.type] || p.type}${p.minQty > 1 ? ` (từ ${p.minQty} sp)` : ''}`,
  }));
  const main = prices.find((p) => p.type === 'RETAIL') || prices[0];

  const attributes = [
    dto.color?.name ? { name: 'Màu sắc', value: dto.color.name, unit: null } : null,
    dto.size?.name ? { name: 'Kích cỡ', value: dto.size.name, unit: null } : null,
    product.material ? { name: 'Chất liệu', value: product.material, unit: null } : null,
    product.season ? { name: 'Mùa', value: product.season, unit: null } : null,
    product.components?.length ? { name: 'Gồm', value: product.components.join(', '), unit: null } : null,
  ].filter(Boolean);

  return {
    id: dto.id,
    productId: product.id ?? null,
    styleCode: product.styleCode || null,
    name: product.name || 'Sản phẩm chưa có tên',
    description: product.description || '',
    category: product.categories?.[0] || null,
    price: main?.price ?? 0,
    prices,
    quantity: dto.stock?.quantity ?? 0,
    sku: dto.sku || null,
    barcode: dto.barcode || null,
    note: dto.note || null,
    status: dto.status || null,
    attributes,
    images,
    image: images[0] || null,
    siblings: (dto.siblings || []).map((s) => ({
      id: s.id,
      color: s.color,
      size: s.size,
      quantity: s.quantity,
      isCurrent: s.id === dto.id,
    })),
  };
}
