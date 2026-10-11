// Chay: npm test   (dung node:test co san, khong can cai them gi)
// Thu ma client THAT trong src/api/ chay vao may chu gia lap bam sat BE (tools/mock-api).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { createHttp, ApiError } from '../src/api/http.js';
import { login } from '../src/api/auth.js';
import { findProductByBarcode, getVariantById, resolveUrl } from '../src/api/products.js';
import { recognizeImage, confirmScan } from '../src/api/scan.js';
import * as adminApi from '../src/api/admin.js';
import { normalizeServerUrl } from '../src/api/serverUrl.js';
import { formatPrice, optimizeImageUrl, stockLabel } from '../src/utils/format.js';

const require = createRequire(import.meta.url);
const { createServer } = require('../tools/mock-api/server.cjs');

let server;
let slowServer;
let baseUrl;
let slowUrl;
let token = null;
let unauthorizedCalls = 0;

const listen = (srv) =>
  new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${srv.address().port}`)));

function client(over = {}) {
  return createHttp({
    getBaseUrl: async () => baseUrl,
    getToken: async () => token,
    onUnauthorized: () => {
      unauthorizedCalls += 1;
    },
    ...over,
  });
}

before(async () => {
  server = createServer();
  slowServer = createServer({ slowMs: 400 });
  baseUrl = await listen(server);
  slowUrl = await listen(slowServer);
});

after(() => {
  server.close();
  slowServer.close();
});

// ---------- dang nhap ----------
test('dang nhap dung -> co token, vai tro va danh sach quyen', async () => {
  const session = await login(client(), 'nhanvien', '123456');
  assert.match(session.token, /^mock\./);
  assert.equal(session.user.fullName, 'Nhân viên bán hàng');
  assert.equal(session.user.role, 'EMPLOYEE');
  assert.ok(session.user.permissions.includes('scan.use'));
  assert.equal(session.user.permissions.includes('product.manage'), false);
  token = session.token;
});

test('dang nhap sai mat khau -> bao loi cua BE, KHONG goi onUnauthorized', async () => {
  unauthorizedCalls = 0;
  await assert.rejects(login(client(), 'nhanvien', 'sai'), (e) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.code, 'UNAUTHORIZED');
    assert.equal(e.message, 'Tài khoản hoặc mật khẩu không đúng.');
    return true;
  });
  assert.equal(unauthorizedCalls, 0);
});

test('dang nhap bo trong -> bao loi ngay, khong goi mang', async () => {
  await assert.rejects(login(client({ getBaseUrl: async () => 'http://127.0.0.1:1' }), '  ', ''), /Nhập tài khoản và mật khẩu/);
});

// ---------- tra ma vach ----------
test('quet ma vach co san pham -> map dung, khong lo gia von', async () => {
  const p = await findProductByBarcode(client(), '8922000001');
  assert.equal(p.id, 1);
  assert.equal(p.name, 'Set len khoá kéo 8922#');
  assert.equal(p.price, 490000, 'gia chinh la gia le');
  assert.deepEqual(p.prices.map((x) => [x.type, x.price]), [['RETAIL', 490000], ['WHOLESALE', 410000]]);
  assert.equal(p.prices[1].label, 'Giá sỉ');
  assert.equal(p.quantity, 12);
  assert.equal(p.category, 'Set len');
  assert.deepEqual(p.attributes.slice(0, 2).map((a) => a.value), ['Xám than', 'Free size']);
  assert.equal(p.images.length, 2);
  assert.equal('costPrice' in p, false, 'khong duoc dua gia von xuong man hinh nhan vien');
});

test('hien cac mau khac cua cung san pham va danh dau mau dang xem', async () => {
  const p = await findProductByBarcode(client(), '8922000002');
  assert.deepEqual(p.siblings.map((s) => [s.color, s.quantity, s.isCurrent]), [
    ['Xám than', 12, false],
    ['Nâu đậm', 3, true],
    ['Be', 0, false],
  ]);
});

test('ma vach dai hon chua ma can tim -> van lay dung san pham', async () => {
  const p = await findProductByBarcode(client(), '8922000001');
  assert.equal(p.id, 1);
});

test('ma vach co khoang trang thua van khop', async () => {
  const p = await findProductByBarcode(client(), '  8922000002 ');
  assert.equal(p.id, 2);
});

test('san pham ngung ban (INACTIVE) -> null', async () => {
  assert.equal(await findProductByBarcode(client(), 'INACTIVE01'), null);
});

test('ma khong co trong he thong -> null (de hien trang Khong tim thay)', async () => {
  assert.equal(await findProductByBarcode(client(), '0000000000000'), null);
  assert.equal(await findProductByBarcode(client(), ''), null);
});

test('iOS bao UPC-A 12 so thanh EAN-13 them so 0 -> van khop', async () => {
  const p = await findProductByBarcode(client(), '0036000291452');
  assert.equal(p.id, 6);
});

test('ma vach co ky tu dac biet duoc ma hoa trong URL', async () => {
  assert.equal(await findProductByBarcode(client(), 'A/B?C#1'), null); // 404, khong vo duong dan
});

test('san pham chua co anh / mo ta khong lam app loi', async () => {
  const p = await findProductByBarcode(client(), '8922000003');
  assert.deepEqual(p.images, []);
  assert.equal(p.image, null);
  assert.equal(p.quantity, 0);
  const q = await findProductByBarcode(client(), '036000291452');
  assert.equal(q.description, '');
  assert.equal(q.siblings.length, 1);
});

test('admin (co product.manage) duoc BE tra gia von nhung lop map van bo di', async () => {
  const admin = await login(client(), 'admin', 'admin123');
  const raw = await client({ getToken: async () => admin.token }).get('/api/variants/by-barcode/8922000001');
  assert.equal(raw.costPrice, 300000);
  const empRaw = await client().get('/api/variants/by-barcode/8922000001');
  assert.equal('costPrice' in empRaw, false, 'nhan vien khong duoc nhan gia von tu BE');
  const mapped = await findProductByBarcode(client({ getToken: async () => admin.token }), '8922000001');
  assert.equal('costPrice' in mapped, false);
});

// ---------- loi mang va phien dang nhap ----------
test('token thieu -> 401 -> het phien, goi onUnauthorized', async () => {
  unauthorizedCalls = 0;
  await assert.rejects(findProductByBarcode(client({ getToken: async () => null }), '8922000001'), (e) => {
    assert.equal(e.code, 'UNAUTHORIZED');
    assert.equal(e.status, 401);
    return true;
  });
  assert.equal(unauthorizedCalls, 1);
});

test('token sai -> cung xu ly nhu het phien', async () => {
  unauthorizedCalls = 0;
  await assert.rejects(findProductByBarcode(client({ getToken: async () => 'mock.hong' }), '8922000001'), { code: 'UNAUTHORIZED' });
  assert.equal(unauthorizedCalls, 1);
});

test('thieu quyen scan.use -> 403 FORBIDDEN, KHONG dang xuat nguoi dung', async () => {
  unauthorizedCalls = 0;
  const viewer = await login(client(), 'khach', '123456');
  await assert.rejects(
    findProductByBarcode(client({ getToken: async () => viewer.token }), '8922000001'),
    (e) => {
      assert.equal(e.code, 'FORBIDDEN');
      assert.equal(e.status, 403);
      return true;
    }
  );
  assert.equal(unauthorizedCalls, 0);
});

test('may chu tat -> loi NETWORK (khong phai "khong tim thay san pham")', async () => {
  await assert.rejects(findProductByBarcode(client({ getBaseUrl: async () => 'http://127.0.0.1:1' }), '8922000001'), { code: 'NETWORK' });
});

test('may chu cham -> TIMEOUT', async () => {
  // slowServer co kho token rieng, nen dang nhap vao do truoc
  const slowSession = await login(client({ getBaseUrl: async () => slowUrl }), 'nhanvien', '123456');
  await assert.rejects(
    findProductByBarcode(
      client({ getBaseUrl: async () => slowUrl, getToken: async () => slowSession.token, timeoutMs: 100 }),
      '8922000001'
    ),
    { code: 'TIMEOUT' }
  );
});

test('chua cai dia chi may chu -> bao loi ro rang', async () => {
  await assert.rejects(findProductByBarcode(client({ getBaseUrl: async () => '' }), '8922000001'), /Chưa cài địa chỉ máy chủ/);
});

// ---------- tien ich ----------
test('normalizeServerUrl', () => {
  assert.equal(normalizeServerUrl('192.168.1.20:8080'), 'http://192.168.1.20:8080');
  assert.equal(normalizeServerUrl('http://192.168.1.20:8080/'), 'http://192.168.1.20:8080');
  assert.equal(normalizeServerUrl('macbook-pro.local:8080'), 'http://macbook-pro.local:8080');
  assert.equal(normalizeServerUrl('localhost:8080'), 'http://localhost:8080');
  assert.equal(normalizeServerUrl('shop.example.com'), 'https://shop.example.com');
  assert.equal(normalizeServerUrl('https://shop.example.com/api'), 'https://shop.example.com');
  assert.equal(normalizeServerUrl('   '), null);
  assert.equal(normalizeServerUrl(null), null);
});

test('formatPrice', () => {
  assert.equal(formatPrice(410000), '410.000đ');
  assert.equal(formatPrice(1250000), '1.250.000đ');
  assert.equal(formatPrice(999), '999đ');
  assert.equal(formatPrice(0), '0đ');
  assert.equal(formatPrice(undefined), '0đ');
});

test('optimizeImageUrl chi dong vao anh Cloudinary chua bien doi', () => {
  assert.equal(
    optimizeImageUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg', 800),
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800/v1/a.jpg'
  );
  const done = 'https://res.cloudinary.com/demo/image/upload/w_300,c_fill/v1/a.jpg';
  assert.equal(optimizeImageUrl(done, 800), done);
  assert.equal(optimizeImageUrl('https://picsum.photos/seed/x/900/1200', 800), 'https://picsum.photos/seed/x/900/1200');
  assert.equal(optimizeImageUrl(null), null);
});

test('stockLabel', () => {
  assert.equal(stockLabel(0).level, 'out');
  assert.equal(stockLabel(3).level, 'low');
  assert.equal(stockLabel(12).level, 'ok');
  assert.equal(stockLabel(12).text, 'Còn 12');
});

// ---------- quet bang anh ----------
const photo = (text) => new Blob([text], { type: 'image/jpeg' });

test('quet anh: chua chac chan -> 2 ung vien sap theo do giong, anh tuong doi duoc ghep voi dia chi may chu', async () => {
  const r = await recognizeImage(client(), photo('AMBIGUOUS'));
  assert.equal(r.confident, false);
  assert.equal(r.candidates.length, 2);
  assert.ok(r.candidates[0].score > r.candidates[1].score);
  const be = r.candidates[1].variant; // mau Be co anh he thong tu luu
  assert.equal(be.image, `${baseUrl}/media/t/mock-be.webp`);
  assert.equal(r.candidates[0].variant.name, 'Set len khoá kéo 8922#');
  assert.equal(r.candidates[0].variant.price, 490000);
  assert.ok(r.scanEventId > 0);
});

test('quet anh: chac chan -> confident, lay duoc chi tiet theo id', async () => {
  const r = await recognizeImage(client(), photo('CONFIDENT'));
  assert.equal(r.confident, true);
  const detail = await getVariantById(client(), r.candidates[0].variant.id);
  assert.equal(detail.sku, '8922-XAMTHAN');
  assert.equal(detail.costPrice, undefined);
});

test('quet anh: khong nhan ra -> danh sach rong, khong nem loi', async () => {
  const r = await recognizeImage(client(), photo('NOTHING'));
  assert.deepEqual(r.candidates, []);
});

test('quet anh: dich vu nhan dien tat (503) -> loi SERVER kem thong bao cua BE', async () => {
  await assert.rejects(recognizeImage(client(), photo('DOWN')), (e) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.code, 'SERVER');
    assert.match(e.message, /nhận diện/);
    return true;
  });
});

test('quet anh: thieu quyen scan.use -> 403, khong dang xuat', async () => {
  const before = unauthorizedCalls;
  const s = await login(client({ getToken: async () => null }), 'khach', '123456');
  await assert.rejects(
    recognizeImage(client({ getToken: async () => s.token }), photo('x')),
    (e) => e.code === 'FORBIDDEN',
  );
  assert.equal(unauthorizedCalls, before);
});

test('xac nhan ket qua quet anh duoc gui len BE; loi khi xac nhan bi nuot', async () => {
  const r = await recognizeImage(client(), photo('AMBIGUOUS'));
  await confirmScan(client(), r.scanEventId, 3);
  assert.deepEqual(server.confirmations.at(-1), { scanEventId: r.scanEventId, variantId: 3 });
  await confirmScan(client({ getBaseUrl: async () => 'http://127.0.0.1:1' }), r.scanEventId, 3); // khong nem loi
  await confirmScan(client(), null, 3); // khong co id -> bo qua
});

test('resolveUrl', () => {
  assert.equal(resolveUrl('/media/t/a.webp', 'http://h:8080/'), 'http://h:8080/media/t/a.webp');
  assert.equal(resolveUrl('https://x.r2.dev/t/a.webp', 'http://h'), 'https://x.r2.dev/t/a.webp');
  assert.equal(resolveUrl('/media/a', null), null);
  assert.equal(resolveUrl(null, 'http://h'), null);
});

// ---------- quan tri san pham ----------
let adminToken = null;
const adminHttp = () => client({ getToken: async () => adminToken });

test('admin: dang nhap co quyen product.manage', async () => {
  const s = await login(client({ getToken: async () => null }), 'admin', 'admin123');
  adminToken = s.token;
  assert.ok(s.user.permissions.includes('product.manage'));
});

test('admin: nhan vien thuong goi API quan tri -> 403 va khong bi dang xuat', async () => {
  const before = unauthorizedCalls;
  await assert.rejects(adminApi.listProducts(client()), (e) => e.code === 'FORBIDDEN');
  assert.equal(unauthorizedCalls, before);
});

test('parseMoney / validate / build request', () => {
  assert.equal(adminApi.parseMoney('490.000đ'), 490000);
  assert.equal(adminApi.parseMoney(''), null);
  assert.equal(adminApi.parseMoney('  '), null);
  assert.match(adminApi.validateProduct({ styleCode: '', name: 'x' }), /mã mẫu/);
  assert.match(adminApi.validateProduct({ styleCode: '1', name: ' ' }), /tên/);
  assert.equal(adminApi.validateProduct({ styleCode: '1', name: 'x' }), null);
  const req = adminApi.buildProductRequest({ ...adminApi.EMPTY_PRODUCT, styleCode: ' 8922 ', name: ' Set ', components: 'Áo, Váy ,', categories: 'Set len' });
  assert.deepEqual(req.components, ['Áo', 'Váy']);
  assert.equal(req.styleCode, '8922');
  assert.equal(req.description, null);
  assert.match(adminApi.validateVariant({ ...adminApi.EMPTY_VARIANT }, { creating: true }), /màu/);
  assert.equal(adminApi.validateVariant({ ...adminApi.EMPTY_VARIANT }, { creating: false }), null);
});

test('buildStockRequest: nhap, xuat, kiem kho, sai so luong', () => {
  assert.deepEqual(adminApi.buildStockRequest('add', '5', ''), { delta: 5, type: 'PURCHASE' });
  assert.deepEqual(adminApi.buildStockRequest('remove', '2', ' hong '), { delta: -2, type: 'ADJUSTMENT', note: 'hong' });
  assert.deepEqual(adminApi.buildStockRequest('set', '0', ''), { setTo: 0, type: 'ADJUSTMENT' });
  assert.throws(() => adminApi.buildStockRequest('add', '', ''), /số lượng/i);
  assert.throws(() => adminApi.buildStockRequest('add', '0', ''), /lớn hơn 0/);
});

test('admin: them -> them bien the -> sua gia giu bac gia so luong -> ton kho -> anh -> xoa', async () => {
  const h = adminHttp();
  let p = await adminApi.createProduct(h, { ...adminApi.EMPTY_PRODUCT, styleCode: '7001', name: 'Áo len thử', categories: 'Áo len' });
  assert.ok(p.id);
  await assert.rejects(adminApi.createProduct(h, { ...adminApi.EMPTY_PRODUCT, styleCode: '7001', name: 'Trùng' }), (e) => e.status === 409);

  p = await adminApi.addVariant(h, p.id, { ...adminApi.EMPTY_VARIANT, color: 'Đen', size: 'M', retail: '299.000', wholesale: '240000', cost: '150000', quantity: '10', minQuantity: '2' });
  assert.equal(p.variants.length, 1);
  let v = p.variants[0];
  assert.equal(v.quantity, 10);
  assert.deepEqual(v.prices.map((x) => [x.type, x.price]), [['RETAIL', 299000], ['WHOLESALE', 240000]]);
  assert.ok(v.barcode && v.sku);
  await assert.rejects(adminApi.addVariant(h, p.id, { ...adminApi.EMPTY_VARIANT, color: 'Đen', size: 'M' }), (e) => e.status === 409);

  // sua gia: bac gia theo so luong (minQty>1) duoc giu nguyen
  v = { ...v, prices: [...v.prices, { type: 'WHOLESALE', minQty: 10, price: 200000 }] };
  const form = adminApi.variantToForm(v);
  assert.equal(form.retail, '299000');
  p = await adminApi.updateVariant(h, v, { ...form, retail: '310000' });
  const prices = p.variants[0].prices;
  assert.equal(prices.find((x) => x.type === 'RETAIL').price, 310000);
  assert.ok(prices.some((x) => x.minQty === 10 && x.price === 200000));

  // ton kho
  let r = await adminApi.adjustStock(h, v.id, adminApi.buildStockRequest('add', '5'));
  assert.equal(r.quantity, 15);
  r = await adminApi.adjustStock(h, v.id, adminApi.buildStockRequest('set', '3'));
  assert.equal(r.quantity, 3);
  await assert.rejects(adminApi.adjustStock(h, v.id, adminApi.buildStockRequest('remove', '9')), (e) => e.status === 409);

  // anh (anh he thong tra duong dan tuong doi -> ghep voi may chu)
  const m1 = await adminApi.uploadPhoto(h, p.id, new Blob(['img1']), null);
  const m2 = await adminApi.uploadPhoto(h, p.id, new Blob(['img2']), v.color.id);
  assert.equal(m1.thumbUrl, `${baseUrl}/media/t/mock${m1.id}.webp`);
  assert.equal(m2.colorId, v.color.id);
  await adminApi.setPrimaryPhoto(h, p.id, m1.id);
  p = await adminApi.getProduct(h, p.id);
  assert.equal(p.media.length, 2);
  assert.ok(p.media[0].url.startsWith(baseUrl));
  await adminApi.deletePhoto(h, p.id, m1.id);
  assert.equal((await adminApi.getProduct(h, p.id)).media.length, 1);

  // tim trong danh sach, roi xoa
  let list = await adminApi.listProducts(h, { q: '7001' });
  assert.equal(list.total, 1);
  p = await adminApi.deleteVariant(h, v.id);
  assert.equal(p.variants.find((x) => x.id === v.id).status, 'INACTIVE');
  await adminApi.deleteProduct(h, p.id);
  list = await adminApi.listProducts(h, { q: '7001' });
  assert.equal(list.total, 0);
  await assert.rejects(adminApi.getProduct(h, p.id), (e) => e.status === 404);
});
