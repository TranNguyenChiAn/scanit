import { ApiError } from './http.js';

// POST /api/auth/login  { shop, account, password }  ->  { token, user: { id, username, fullName, role, shop, permissions } }
// "shop" la ma cua hang (vd mei-bee); "account" la username, email hoac so dien thoai (duy nhat trong tung cua hang).
export async function login(http, account, password, shop) {
  const acc = (account || '').trim();
  if (!acc || !password) {
    throw new ApiError('Nhập tài khoản và mật khẩu.', { code: 'HTTP' });
  }
  const shopCode = (shop || '').trim().toLowerCase();
  if (!shopCode) {
    throw new ApiError('Nhập mã cửa hàng (do nhà cung cấp cấp, ví dụ mei-bee).', { code: 'HTTP' });
  }

  // auth: false -> 401 o day la sai mat khau, khong phai het phien
  const data = await http.post('/api/auth/login', { shop: shopCode, account: acc, password }, { auth: false });

  if (!data?.token || !data?.user) {
    throw new ApiError('Máy chủ trả về dữ liệu đăng nhập không hợp lệ.', { code: 'SERVER' });
  }
  return { token: data.token, user: mapUser(data.user) };
}

export function mapUser(dto) {
  return {
    id: dto.id,
    fullName: dto.fullName || dto.username || 'Nhân viên',
    username: dto.username || null,
    role: dto.role || null,
    shop: dto.shop ? { id: dto.shop.id, code: dto.shop.code, name: dto.shop.name } : null,
    permissions: Array.isArray(dto.permissions) ? dto.permissions : [],
  };
}
