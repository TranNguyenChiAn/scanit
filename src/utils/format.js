// 350000 -> "350.000đ" (tu viet de ket qua giong nhau tren moi may, khong phu thuoc Intl)
export function formatPrice(price) {
  const n = Math.round(Number(price) || 0);
  const sign = n < 0 ? '-' : '';
  return `${sign}${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

// Anh tren Cloudinary: them f_auto (tu chon WebP/AVIF), q_auto (tu chon chat luong), w_<rong>
// de dien thoai chi tai ban nho, khong tai anh goc vai MB.
// Anh khong phai Cloudinary hoac da co bien doi san thi giu nguyen.
export function optimizeImageUrl(url, width = 800) {
  if (!url || typeof url !== 'string') return null;
  if (!/^https?:\/\/res\.cloudinary\.com\//.test(url)) return url;
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  const alreadyTransformed = /^[a-z]{1,3}_[^/]+(,[a-z]{1,3}_[^/]+)*\//.test(parts[1]);
  if (alreadyTransformed) return url;
  return `${parts[0]}/upload/f_auto,q_auto,w_${width}/${parts[1]}`;
}

// Nguon anh cho <Image>: null neu san pham chua co anh
export function imageSource(url, width) {
  const optimized = optimizeImageUrl(url, width);
  return optimized ? { uri: optimized } : null;
}

export function stockLabel(quantity) {
  if (quantity <= 0) return { text: 'Hết hàng', level: 'out' };
  if (quantity <= 5) return { text: `Còn ${quantity} (sắp hết)`, level: 'low' };
  return { text: `Còn ${quantity}`, level: 'ok' };
}
