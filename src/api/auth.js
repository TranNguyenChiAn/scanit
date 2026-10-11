import { ApiError } from './http.js';

// POST /api/auth/login  { account, password }  ->  { token, user: { id, username, fullName, role, permissions } }
// "account" la username, email hoac so dien thoai.
export async function login(http, account, password) {
  const acc = (account || '').trim();
  if (!acc || !password) {
    throw new ApiError('Nhập tài khoản và mật khẩu.', { code: 'HTTP' });
  }

  // auth: false -> 401 o day la sai mat khau, khong phai het phien
  const data = await http.post('/api/auth/login', { account: acc, password }, { auth: false });

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
    permissions: Array.isArray(dto.permissions) ? dto.permissions : [],
  };
}
