import { mapSummary } from './products.js';

// Quet bang anh: POST /api/scan/image (multipart, truong "file").
// `file` la { uri, name, type } tren React Native (hoac Blob khi chay thu bang Node).
// Tra { scanEventId, confident, candidates: [{ score, variant }] }, ung vien da sap theo do giong giam dan.
export async function recognizeImage(http, file) {
  const form = new FormData();
  form.append('file', file);
  const dto = await http.postForm('/api/scan/image', form);
  const baseUrl = await http.baseUrl();
  return {
    scanEventId: dto?.scanEventId ?? null,
    confident: !!dto?.confident,
    candidates: (dto?.candidates || []).map((c) => ({
      score: c.score,
      variant: mapSummary(c.variant, baseUrl),
    })),
  };
}

// Bao BE biet nhan vien da chon dung ung vien nay (de do chinh xac). Loi o day khong duoc lam hong luong chinh.
export async function confirmScan(http, scanEventId, variantId) {
  if (!scanEventId) return;
  try {
    await http.post(`/api/scan/${scanEventId}/confirm`, { variantId });
  } catch {
    // bo qua: chi la so lieu thong ke
  }
}
