// May chu gia lap API ScanIt (repo scanit-api), dung de thu app khi chua chay BE that.
// Bam sat hop dong cua scanit-api: xem CatalogDtos.java va AuthDtos.java.
//   * Thieu / sai token  -> 401 { code, message }.   Thieu quyen -> 403.
//   * Tra ma vach chinh xac, khop ca ma bo so 0 dau (UPC-A / EAN-13). Khong thay -> 404.
//
// Chay:  node tools/mock-api/server.cjs   (cong 8080, doi bang PORT=...)
// Tai khoan thu: nhanvien / 123456  (EMPLOYEE),  admin / admin123  (ADMIN)

const http = require('http');

// Giong BE that: moi id tra ve dang CHUOI va lon hon 2^53 (Snowflake), de bat loi mat chinh xac o app.
// Du lieu trong bo nho van dung so nho; chuyen qua lai o day.
const ID_BASE = 4000000000000000000n;
const wireId = (n) => String(ID_BASE + BigInt(n));
const fromWire = (s) => {
  const t = String(s);
  return /^\d{16,}$/.test(t) ? Number(BigInt(t) - ID_BASE) : Number(t);
};
const isIdKey = (k) => k === 'id' || /Id$/.test(k);
const SHOP = { id: 1, code: 'mei-bee', name: 'MEI.BEE studio' };
const { randomBytes } = require('crypto');

const EMPLOYEE_PERMS = ['customer.view', 'order.create', 'order.view', 'product.view', 'scan.use', 'stock.view'];
const ADMIN_PERMS = [...EMPLOYEE_PERMS, 'order.cancel', 'order.price', 'debt.collect', 'debt.view', 'product.manage', 'report.view', 'role.manage', 'stock.adjust', 'user.manage'].sort();

const USERS = [
  { id: 1, account: 'admin', password: 'admin123', fullName: 'Quản trị viên', username: 'admin', role: 'ADMIN', permissions: ADMIN_PERMS },
  { id: 2, account: 'nhanvien', password: '123456', fullName: 'Nhân viên bán hàng', username: 'nhanvien', role: 'EMPLOYEE', permissions: EMPLOYEE_PERMS },
  // Khong co quyen scan.use, de thu 403
  { id: 3, account: 'khach', password: '123456', fullName: 'Chỉ xem', username: 'khach', role: 'VIEWER', permissions: ['product.view'] },
];

const SET = {
  id: 1, styleCode: '8922', name: 'Set len khoá kéo 8922#',
  description: 'Set áo khoác len mũ trùm khoá kéo phối chân váy dài chữ A. Chất len mềm, co giãn nhẹ.',
  material: null, season: 'Thu đông', productType: 'SET', components: ['Áo khoác len', 'Chân váy dài'], categories: ['Set len'],
};

const PRICES = [
  { type: 'RETAIL', minQty: 1, price: 490000 },
  { type: 'WHOLESALE', minQty: 1, price: 410000 },
];

function variant(id, { barcode, sku, color, quantity, product = SET, prices = PRICES, images = [], status = 'ACTIVE', size = 'Free size', note = null }) {
  return {
    id, sku, barcode, status, product, note,
    color: { id, name: color, hex: null },
    size: { id: 1, name: size },
    prices,
    stock: { quantity, minQuantity: 5, low: quantity <= 5 },
    images,
    costPrice: 300000, // chi duoc tra khi co quyen product.manage
  };
}

const VARIANTS = [
  variant(1, { barcode: '8922000001', sku: '8922-XAMTHAN', color: 'Xám than', quantity: 12, images: ['https://res.cloudinary.com/demo/image/upload/v1/set8922-xam.jpg', 'https://picsum.photos/seed/8922a/900/1200'] }),
  variant(2, { barcode: '8922000002', sku: '8922-NAUDAM', color: 'Nâu đậm', quantity: 3, note: 'Hàng order, về cuối tháng', images: ['https://picsum.photos/seed/8922b/900/1200'] }),
  variant(3, { barcode: '8922000003', sku: '8922-BE', color: 'Be', quantity: 0 }),
  // Ma dai hon chua ma 8922000001: tra ma chinh xac thi khong bi nham
  variant(4, { barcode: '89220000011', sku: 'DECOY-1', color: 'Đen', quantity: 5, product: { ...SET, id: 2, styleCode: 'X', name: 'Sản phẩm khác', description: '', components: [], categories: [] }, prices: [{ type: 'RETAIL', minQty: 1, price: 99000 }] }),
  variant(5, { barcode: 'INACTIVE01', sku: 'OFF-1', color: 'Đỏ', quantity: 1, status: 'INACTIVE' }),
  // UPC-A 12 so; iOS bao thanh EAN-13 voi so 0 o dau
  variant(6, { barcode: '036000291452', sku: 'UPC-1', color: 'Trắng', quantity: 20, product: { ...SET, id: 3, styleCode: 'T', name: 'Áo thun trắng', description: '', components: [], categories: [] }, prices: [{ type: 'RETAIL', minQty: 1, price: 150000 }] }),
];

const summaryOf = (v) => ({
  id: v.id, sku: v.sku, barcode: v.barcode, productName: v.product.name, color: v.color.name, size: v.size.name,
  retailPrice: (v.prices.find((p) => p.type === 'RETAIL') || {}).price, quantity: v.stock.quantity,
  // Anh he thong tu luu: BE tra duong dan tuong doi (/media/...), app tu ghep voi dia chi may chu
  image: v.images[0] || (v.id === 3 ? '/media/t/mock-be.webp' : undefined),
  note: v.note || undefined,
});

// 1x1 PNG, de duong dan /media/... mo duoc
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const stripZeros = (c) => c.replace(/^0+/, '');

function detailOf(v, user) {
  const siblings = VARIANTS.filter((s) => s.product.id === v.product.id && s.status === 'ACTIVE').map((s) => ({
    id: s.id, sku: s.sku, barcode: s.barcode, color: s.color.name, size: s.size.name, quantity: s.stock.quantity,
  }));
  const { costPrice, ...rest } = v;
  return { ...rest, siblings, ...(user.permissions.includes('product.manage') ? { costPrice } : {}) };
}

function createServer({ slowMs = 0 } = {}) {
  const sessions = new Map(); // token -> user
  let scanEvents = 100;
  const adminState = { products: [], nextProduct: 1, nextVariant: 500, nextMedia: 1, nextSkuBase: '' };
  const confirmations = [];
  // Don hang: ton kho rieng cua tung may chu gia lap, de test khong lam lech du lieu cua test khac
  const stock = new Map(VARIANTS.map((v) => [v.id, v.stock.quantity]));
  const orders = [];
  let saleSeq = 0;
  let draftSeq = 0;
  const pad2 = (n) => String(n).padStart(2, '0');
  const localDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(body === undefined ? '' : JSON.stringify(body, (k, v) => (typeof v === 'number' && isIdKey(k) ? wireId(v) : v)));
  };
  const err = (res, status, code, message) => send(res, status, { code, message });

  const readRaw = (req) =>
    new Promise((resolve) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
    });

  const readBody = (req) =>
    new Promise((resolve) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
      });
    });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname.startsWith('/media/')) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' });
      return res.end(PIXEL);
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const { shop, account, password } = await readBody(req);
      const user = USERS.find((u) => u.account === account);
      if (String(shop || '').trim().toLowerCase() !== SHOP.code || !user || user.password !== password) return err(res, 401, 'BAD_CREDENTIALS', 'Tài khoản hoặc mật khẩu không đúng.');
      const token = `mock.${randomBytes(12).toString('hex')}`;
      sessions.set(token, user);
      const { password: _p, account: _a, ...view } = user;
      return send(res, 200, { token, user: { ...view, shop: SHOP } });
    }

    const bearer = req.headers.authorization || '';
    const user = sessions.get(bearer.startsWith('Bearer ') ? bearer.slice(7) : '');
    if (!user) return err(res, 401, 'UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn. Đăng nhập lại.');



    // ---- Don hang va bao cao (mo phong OrderController / ReportController cua BE) ----
    const seesAll = user.permissions.includes('report.view');
    const forbid = () => err(res, 403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
    const payOf = (status, paid, total) => {
      const st = String(status || 'UNPAID').toUpperCase();
      if (!['UNPAID', 'PARTIAL', 'PAID'].includes(st)) return { error: 'Trạng thái thanh toán không hợp lệ.' };
      if (st === 'PAID') return { status: st, paid: total };
      if (st === 'UNPAID') return { status: st, paid: 0 };
      if (!paid || paid <= 0 || paid >= total) return { error: 'Thanh toán một phần: nhập số tiền đã trả lớn hơn 0 và nhỏ hơn tổng đơn.' };
      return { status: st, paid };
    };
    const orderCost = (o) => o.items.reduce((s, i) => s + i.quantity * i.costPrice, 0);
    const orderView = (o) => ({
      id: o.id, code: o.code, orderType: 'RETAIL', status: o.status, paymentStatus: o.paymentStatus,
      subtotal: o.subtotal, discount: o.discount, total: o.total, paid: o.paid, owed: Math.max(o.total - o.paid, 0),
      customerName: o.customerName, customerPhone: o.customerPhone, note: o.note, staffName: o.staffName,
      orderedAt: o.orderedAt, itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
      items: o.items.map((i) => {
        const v = VARIANTS.find((x) => x.id === i.variantId);
        return {
          variantId: i.variantId, sku: v.sku, productName: v.product.name, color: v.color.name, size: v.size.name,
          quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.quantity * i.unitPrice, costPrice: seesAll ? i.costPrice : null, stock: stock.get(i.variantId),
        };
      }),
      profit: seesAll ? o.total - orderCost(o) : null,
    });
    const visible = () => orders.filter((o) => o.status !== 'DELETED' && (seesAll || o.staffId === user.id));

    if (url.pathname === '/api/variants' && req.method === 'GET') {
      if (!user.permissions.includes('product.view')) return forbid();
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const items = VARIANTS.filter((v) => v.status === 'ACTIVE' && (!q || [v.sku, v.barcode, v.product.name, v.product.styleCode].some((x) => String(x || '').toLowerCase().includes(q))))
        .map((v) => ({ ...summaryOf(v), quantity: stock.get(v.id) }));
      return send(res, 200, { items, page: 0, size: 30, total: items.length });
    }

    // Tinh dong hang + thanh toan tu yeu cau. Gia: chi nguoi co order.price moi dat duoc, con lai theo bang gia.
    const buildContent = (b) => {
      const merged = new Map();
      for (const l of b.items || []) {
        const v = VARIANTS.find((x) => x.id === fromWire(l.variantId) && x.status === 'ACTIVE');
        if (!v) return { error: 'Có sản phẩm đã ngừng bán hoặc không tồn tại, hãy kiểm tra lại đơn.' };
        if (!(l.quantity >= 1)) return { error: 'Số lượng tối thiểu là 1' };
        const m = merged.get(v.id) || { v, quantity: 0, price: user.permissions.includes('order.price') ? l.unitPrice : undefined };
        m.quantity += l.quantity;
        merged.set(v.id, m);
      }
      const lines = [];
      for (const { v, quantity, price } of merged.values()) {
        const unitPrice = price ?? (v.prices.find((p) => p.type === 'RETAIL') || {}).price;
        if (unitPrice === undefined || unitPrice === null) return { error: `Chưa có giá bán cho ${v.product.name}.` };
        lines.push({ variantId: v.id, quantity, unitPrice, costPrice: v.costPrice });
      }
      const subtotal = lines.reduce((s2, l) => s2 + l.quantity * l.unitPrice, 0);
      const discount = b.discount || 0;
      if (discount > subtotal) return { error: 'Giảm giá không được lớn hơn tổng tiền hàng.' };
      const total = subtotal - discount;
      const pay = payOf(b.paymentStatus, b.paidAmount, total);
      if (pay.error) return { error: pay.error };
      return { lines, subtotal, discount, total, pay };
    };
    const applyContent = (o, b, c) => {
      Object.assign(o, {
        items: c.lines, subtotal: c.subtotal, discount: c.discount, total: c.total, paid: c.pay.paid, paymentStatus: c.pay.status,
        customerName: b.customerName || null, customerPhone: b.customerPhone || null, note: b.note || null,
      });
    };
    // Chot don tam: tru kho, doi ma. Tra ve chuoi loi neu khong chot duoc (khong thay doi gi).
    const finalize = (o) => {
      if (!o.items.length) return { status: 400, code: 'VALIDATION', message: 'Đơn chưa có sản phẩm.' };
      for (const l of o.items) {
        const v = VARIANTS.find((x) => x.id === l.variantId);
        if (stock.get(v.id) < l.quantity) return { status: 409, code: 'CONFLICT', message: `Không đủ tồn kho: ${v.product.name} ${v.color.name}/${v.size.name} (còn ${stock.get(v.id)}).` };
      }
      o.items.forEach((l) => stock.set(l.variantId, stock.get(l.variantId) - l.quantity));
      o.status = 'COMPLETED';
      o.code = `DH${String(++saleSeq).padStart(6, '0')}`;
      o.orderedAt = new Date().toISOString();
      return null;
    };

    if (url.pathname === '/api/orders' && req.method === 'POST') {
      if (!user.permissions.includes('order.create')) return forbid();
      const b = await readBody(req);
      const c = buildContent(b);
      if (c.error) return err(res, 400, 'VALIDATION', c.error);
      const o = {
        id: orders.length + 1, code: `TAM${String(++draftSeq).padStart(4, '0')}`, status: 'DRAFT', staffId: user.id, staffName: user.fullName,
        orderedAt: new Date().toISOString(),
      };
      applyContent(o, b, c);
      if (b.confirm) {
        const f = finalize(o);
        if (f) { draftSeq -= 1; return err(res, f.status, f.code, f.message); }
      }
      orders.push(o);
      return send(res, 201, orderView(o));
    }

    if (url.pathname === '/api/orders' && req.method === 'GET') {
      if (!user.permissions.includes('order.view')) return forbid();
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const st = url.searchParams.get('status') || '';
      const pm = url.searchParams.get('payment') || '';
      const list = visible().filter((o) => (!st || o.status === st) && (!pm || o.paymentStatus === pm)
        && (!q || o.code.toLowerCase().includes(q) || String(o.customerName || '').toLowerCase().includes(q) || String(o.customerPhone || '').includes(q)))
        .sort((a, b) => b.id - a.id);
      const items = list.map((o) => ({
        id: o.id, code: o.code, status: o.status, paymentStatus: o.paymentStatus, total: o.total, paid: o.paid,
        itemCount: o.items.reduce((n, i) => n + i.quantity, 0), customerName: o.customerName, staffName: o.staffName, orderedAt: o.orderedAt,
      }));
      return send(res, 200, { items, page: 0, size: 50, total: items.length });
    }

    const orderRoute = url.pathname.match(/^\/api\/orders\/(\d+)(\/payment|\/cancel|\/confirm)?$/);
    if (orderRoute) {
      const o = visible().find((x) => x.id === fromWire(orderRoute[1]));
      const sub = orderRoute[2];
      if (req.method === 'GET' && !sub) {
        if (!user.permissions.includes('order.view')) return forbid();
        return o ? send(res, 200, orderView(o)) : err(res, 404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
      }
      if (req.method === 'PUT' && !sub) {
        if (!user.permissions.includes('order.create')) return forbid();
        if (!o) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
        if (o.status !== 'DRAFT') return err(res, 409, 'CONFLICT', 'Chỉ sửa được đơn tạm.');
        const b = await readBody(req);
        const c = buildContent(b);
        if (c.error) return err(res, 400, 'VALIDATION', c.error);
        const snapshot = { ...o };
        applyContent(o, b, c);
        if (b.confirm) {
          const f = finalize(o);
          if (f) { Object.assign(o, snapshot); return err(res, f.status, f.code, f.message); }
        }
        return send(res, 200, orderView(o));
      }
      if (req.method === 'POST' && sub === '/confirm') {
        if (!user.permissions.includes('order.create')) return forbid();
        if (!o) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
        if (o.status !== 'DRAFT') return err(res, 409, 'CONFLICT', 'Đơn này không còn là đơn tạm.');
        const f = finalize(o);
        return f ? err(res, f.status, f.code, f.message) : send(res, 200, orderView(o));
      }
      if (req.method === 'DELETE' && !sub) {
        if (!user.permissions.includes('order.create')) return forbid();
        if (!o) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
        if (o.status !== 'DRAFT') return err(res, 409, 'CONFLICT', 'Chỉ xoá được đơn tạm. Đơn đã chốt thì huỷ đơn.');
        o.status = 'DELETED';
        return send(res, 204);
      }
      if (req.method === 'PATCH' && sub === '/payment') {
        if (!user.permissions.includes('order.create')) return forbid();
        if (!o) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
        if (o.status === 'CANCELLED') return err(res, 409, 'CONFLICT', 'Đơn đã huỷ, không cập nhật thanh toán.');
        const b = await readBody(req);
        const pay = payOf(b.paymentStatus, b.paidAmount, o.total);
        if (pay.error) return err(res, 400, 'VALIDATION', pay.error);
        o.paymentStatus = pay.status;
        o.paid = pay.paid;
        return send(res, 200, orderView(o));
      }
      if (req.method === 'POST' && sub === '/cancel') {
        if (!user.permissions.includes('order.cancel')) return forbid();
        if (!o) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
        if (o.status === 'CANCELLED') return err(res, 409, 'CONFLICT', 'Đơn này đã được huỷ trước đó.');
        if (o.status === 'DRAFT') return err(res, 409, 'CONFLICT', 'Đơn tạm chưa trừ kho nên không huỷ, hãy xoá đơn tạm.');
        o.items.forEach((i) => stock.set(i.variantId, stock.get(i.variantId) + i.quantity));
        o.status = 'CANCELLED';
        return send(res, 200, orderView(o));
      }
    }

    if (url.pathname === '/api/admin/reports/summary' && req.method === 'GET') {
      if (!user.permissions.includes('report.view')) return forbid();
      const today = new Date();
      const to = url.searchParams.get('to') || localDate(today);
      const from = url.searchParams.get('from') || `${to.slice(0, 8)}01`;
      if (from > to) return err(res, 400, 'VALIDATION', 'Ngày bắt đầu phải trước ngày kết thúc.');
      const live = orders.filter((o) => o.status === 'COMPLETED' && localDate(new Date(o.orderedAt)) >= from && localDate(new Date(o.orderedAt)) <= to);
      const days = new Map();
      for (let d = new Date(`${from}T00:00:00`); localDate(d) <= to; d.setDate(d.getDate() + 1)) days.set(localDate(d), { orders: 0, revenue: 0, cogs: 0 });
      live.forEach((o) => {
        const d = days.get(localDate(new Date(o.orderedAt)));
        d.orders += 1; d.revenue += o.total; d.cogs += orderCost(o);
      });
      const revenue = live.reduce((s, o) => s + o.total, 0);
      const cogs = live.reduce((s, o) => s + orderCost(o), 0);
      const paid = live.reduce((s, o) => s + o.paid, 0);
      const byProduct = new Map();
      live.forEach((o) => o.items.forEach((i) => {
        const v = VARIANTS.find((x) => x.id === i.variantId);
        const t = byProduct.get(v.product.id) || { productId: v.product.id, name: v.product.name, quantity: 0, revenue: 0, profit: 0 };
        t.quantity += i.quantity; t.revenue += i.quantity * i.unitPrice; t.profit += i.quantity * (i.unitPrice - i.costPrice);
        byProduct.set(v.product.id, t);
      }));
      return send(res, 200, {
        from, to, orders: live.length, itemsSold: live.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0),
        revenue, cogs, profit: revenue - cogs, marginPct: revenue ? Math.round(((revenue - cogs) * 1000) / revenue) / 10 : 0,
        paid, unpaid: Math.max(revenue - paid, 0), discount: live.reduce((s, o) => s + o.discount, 0),
        daily: [...days].map(([date, d]) => ({ date, orders: d.orders, revenue: d.revenue, profit: d.revenue - d.cogs })),
        top: [...byProduct.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
      });
    }

    // ---- Quan tri san pham (can product.manage). Du lieu trong bo nho, mo phong hop dong /api/admin/* cua BE ----
    if (url.pathname.startsWith('/api/admin/')) {
      if (!user.permissions.includes('product.manage')) return err(res, 403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
      const path = url.pathname.slice('/api/admin'.length);
      const A = adminState;
      const live = () => A.products.filter((p) => !p.deleted);
      const view = (p) => ({
        id: p.id, styleCode: p.styleCode, name: p.name, description: p.description, brand: p.brand, material: p.material,
        season: p.season, targetGender: null, productType: p.productType, components: p.components, status: p.status,
        categories: p.categories, variants: p.variants, media: p.media,
      });
      const mustProduct = (id) => live().find((p) => p.id === fromWire(id));
      const mustVariant = (id) => {
        for (const p of live()) { const v = p.variants.find((x) => x.id === fromWire(id) && x.status === 'ACTIVE'); if (v) return [p, v]; }
        return [];
      };
      const valid = (b) => (!b.styleCode || !b.name ? 'Thiếu mã mẫu hoặc tên sản phẩm' : null);
      const fields = (b) => ({
        styleCode: b.styleCode, name: b.name, description: b.description ?? null, brand: b.brand ?? null, material: b.material ?? null,
        season: b.season ?? null, productType: b.productType || 'SINGLE', components: b.components || [], status: b.status || 'ACTIVE',
        categories: b.categories || [],
      });
      const mkVariant = (b) => {
        const id = A.nextVariant++;
        return {
          id, sku: b.sku || `${A.nextSkuBase}-${String(b.color).toUpperCase().replace(/\s+/g, '')}-${String(b.size).toUpperCase().replace(/\s+/g, '')}`,
          barcode: b.barcode || `2000000${String(id).padStart(5, '0')}`, status: 'ACTIVE',
          color: { id: id, name: b.color, hex: null }, size: { id: id, name: b.size }, costPrice: b.costPrice || 0,
          prices: b.prices || [], quantity: b.quantity || 0, minQuantity: b.minQuantity || 0, note: b.note || null,
        };
      };

      if (req.method === 'GET' && path === '/colors') return send(res, 200, [{ id: 1, name: 'Xám than', extra: null }, { id: 2, name: 'Be', extra: null }]);

      if (path === '/products' && req.method === 'GET') {
        const q = (url.searchParams.get('q') || '').toLowerCase();
        const items = live().filter((p) => !q || p.name.toLowerCase().includes(q) || p.styleCode.toLowerCase().includes(q)).map((p) => ({
          id: p.id, styleCode: p.styleCode, name: p.name, status: p.status, productType: p.productType,
          variantCount: p.variants.filter((v) => v.status === 'ACTIVE').length,
          totalQuantity: p.variants.filter((v) => v.status === 'ACTIVE').reduce((n, v) => n + v.quantity, 0),
          image: (p.media[0] || {}).thumbUrl,
        }));
        return send(res, 200, { items, page: 0, size: 100, total: items.length });
      }
      if (path === '/products' && req.method === 'POST') {
        const b = await readBody(req);
        const bad = valid(b);
        if (bad) return err(res, 400, 'VALIDATION', bad);
        if (live().some((p) => p.styleCode.toLowerCase() === b.styleCode.toLowerCase())) return err(res, 409, 'CONFLICT', `Mã mẫu ${b.styleCode} đã tồn tại.`);
        const p = { id: A.nextProduct++, ...fields(b), variants: [], media: [], deleted: false };
        const incoming = b.variants || [];
        const seen = new Set();
        for (const v of incoming) {
          const k = `${String(v.color).toLowerCase()}|${String(v.size).toLowerCase()}`;
          if (!v.color || !v.size) return err(res, 400, 'VALIDATION', 'Thiếu màu hoặc size');
          if (seen.has(k)) return err(res, 409, 'CONFLICT', `Trùng biến thể ${v.color} / ${v.size}.`);
          seen.add(k);
        }
        A.nextSkuBase = p.styleCode;
        for (const v of incoming) p.variants.push(mkVariant(v));
        A.products.push(p);
        return send(res, 201, view(p));
      }
      let m = path.match(/^\/products\/(\d+)$/);
      if (m) {
        const p = mustProduct(m[1]);
        if (!p) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy sản phẩm.');
        if (req.method === 'GET') return send(res, 200, view(p));
        if (req.method === 'PUT') {
          const b = await readBody(req);
          const bad = valid(b);
          if (bad) return err(res, 400, 'VALIDATION', bad);
          if (live().some((x) => x.id !== p.id && x.styleCode.toLowerCase() === b.styleCode.toLowerCase())) return err(res, 409, 'CONFLICT', `Mã mẫu ${b.styleCode} đã tồn tại.`);
          Object.assign(p, fields(b));
          return send(res, 200, view(p));
        }
        if (req.method === 'DELETE') { p.deleted = true; return send(res, 204); }
      }
      m = path.match(/^\/products\/(\d+)\/variants$/);
      if (m && req.method === 'POST') {
        const p = mustProduct(m[1]);
        if (!p) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy sản phẩm.');
        const b = await readBody(req);
        if (!b.color || !b.size) return err(res, 400, 'VALIDATION', 'Thiếu màu hoặc size');
        if (p.variants.some((v) => v.status === 'ACTIVE' && v.color.name === b.color && v.size.name === b.size)) {
          return err(res, 409, 'CONFLICT', `Sản phẩm đã có biến thể màu ${b.color} / size ${b.size}.`);
        }
        A.nextSkuBase = p.styleCode;
        p.variants.push(mkVariant(b));
        return send(res, 201, view(p));
      }
      m = path.match(/^\/variants\/(\d+)$/);
      if (m) {
        const [p, v] = mustVariant(m[1]);
        if (!v) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy biến thể.');
        if (req.method === 'PUT') {
          const b = await readBody(req);
          if (b.sku) v.sku = b.sku;
          if (b.barcode !== undefined && b.barcode !== null) v.barcode = b.barcode || `2000000${String(v.id).padStart(5, '0')}`;
          if (b.costPrice !== undefined && b.costPrice !== null) v.costPrice = b.costPrice;
          if (b.prices) v.prices = b.prices;
          if (b.minQuantity !== undefined && b.minQuantity !== null) v.minQuantity = b.minQuantity;
          if (b.note !== undefined && b.note !== null) v.note = b.note.trim() || null;
          return send(res, 200, view(p));
        }
        if (req.method === 'DELETE') { v.status = 'INACTIVE'; return send(res, 200, view(p)); }
      }
      m = path.match(/^\/variants\/(\d+)\/stock$/);
      if (m && req.method === 'POST') {
        if (!user.permissions.includes('stock.adjust')) return err(res, 403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
        const [, v] = mustVariant(m[1]);
        if (!v) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy biến thể.');
        const b = await readBody(req);
        const target = b.setTo != null ? b.setTo : v.quantity + (b.delta || 0);
        if ((b.setTo == null) === (b.delta == null)) return err(res, 400, 'VALIDATION', 'Chỉ nhập một trong hai: delta hoặc setTo.');
        if (target < 0) return err(res, 409, 'CONFLICT', `Tồn kho không đủ (hiện có ${v.quantity}).`);
        const delta = target - v.quantity;
        v.quantity = target;
        return send(res, 200, { variantId: v.id, quantity: target, delta });
      }
      m = path.match(/^\/products\/(\d+)\/media$/);
      if (m && req.method === 'POST') {
        const p = mustProduct(m[1]);
        if (!p) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy sản phẩm.');
        const raw = await readRaw(req);
        if (!/name="file"/.test(raw)) return err(res, 400, 'VALIDATION', 'Chưa chọn ảnh.');
        const cm = raw.match(/name="colorId"\r\n\r\n(\d+)/);
        const id = A.nextMedia++;
        const item = { id, colorId: cm ? fromWire(cm[1]) : null, url: `/media/m/mock${id}.webp`, thumbUrl: `/media/t/mock${id}.webp`, primary: p.media.length === 0, sortOrder: p.media.length, width: 1200, height: 1600, sizeBytes: 90000 };
        p.media.push(item);
        return send(res, 201, item);
      }
      m = path.match(/^\/products\/(\d+)\/media\/(\d+)$/);
      if (m) {
        const p = mustProduct(m[1]);
        const item = p && p.media.find((x) => x.id === fromWire(m[2]));
        if (!item) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy ảnh.');
        if (req.method === 'PATCH') {
          const b = await readBody(req);
          if (b.primary) p.media.forEach((x) => { x.primary = x.colorId === item.colorId ? x.id === item.id : x.primary; });
          return send(res, 200, item);
        }
        if (req.method === 'DELETE') {
          p.media = p.media.filter((x) => x.id !== item.id);
          if (item.primary) { const nx = p.media.find((x) => x.colorId === item.colorId); if (nx) nx.primary = true; }
          return send(res, 204);
        }
      }
      return err(res, 404, 'NOT_FOUND', 'Không tìm thấy');
    }

    const byBarcode = url.pathname.match(/^\/api\/variants\/by-barcode\/(.+)$/);
    if (req.method === 'GET' && byBarcode) {
      if (!user.permissions.includes('scan.use')) return err(res, 403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
      if (slowMs) await new Promise((r) => setTimeout(r, slowMs));
      const code = decodeURIComponent(byBarcode[1]).trim();
      const norm = stripZeros(code);
      const live = VARIANTS.filter((v) => v.status === 'ACTIVE');
      const found = live.find((v) => v.barcode === code) || (norm ? live.find((v) => stripZeros(v.barcode) === norm) : null);
      if (!found) return err(res, 404, 'NOT_FOUND', 'Không tìm thấy sản phẩm với mã vạch này.');
      return send(res, 200, detailOf(found, user));
    }

    const byId = url.pathname.match(/^\/api\/variants\/(\d+)$/);
    if (req.method === 'GET' && byId) {
      if (!user.permissions.includes('product.view')) return err(res, 403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
      const found = VARIANTS.find((v) => v.id === fromWire(byId[1]));
      return found ? send(res, 200, detailOf(found, user)) : err(res, 404, 'NOT_FOUND', 'Không tìm thấy sản phẩm.');
    }

    // Quet bang anh. Mock KHONG nhan dien that: dua vao noi dung tep gui len de tra cac tinh huong khac nhau.
    //   chua "CONFIDENT" -> chac chan | "DOWN" -> 503 | "NOTHING" -> khong co ung vien | con lai -> 2 ung vien
    if (req.method === 'POST' && url.pathname === '/api/scan/image') {
      if (!user.permissions.includes('scan.use')) return err(res, 403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
      const raw = await readRaw(req);
      if (!/name="file"/.test(raw)) return err(res, 400, 'VALIDATION', 'Chưa có ảnh.');
      if (raw.includes('DOWN')) return err(res, 503, 'RECOGNIZER_DOWN', 'Không kết nối được dịch vụ nhận diện ảnh.');
      scanEvents += 1;
      if (raw.includes('NOTHING')) return send(res, 200, { scanEventId: scanEvents, confident: false, candidates: [] });
      const confident = raw.includes('CONFIDENT');
      const cands = [
        { score: confident ? 0.91 : 0.74, variant: summaryOf(VARIANTS[0]) },
        { score: confident ? 0.62 : 0.68, variant: summaryOf(VARIANTS[2]) },
      ];
      return send(res, 200, { scanEventId: scanEvents, confident, candidates: cands });
    }

    const confirm = url.pathname.match(/^\/api\/scan\/(\d+)\/confirm$/);
    if (req.method === 'POST' && confirm) {
      const { variantId } = await readBody(req);
      confirmations.push({ scanEventId: fromWire(confirm[1]), variantId: fromWire(variantId) });
      res.writeHead(204);
      return res.end();
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const { password: _p, account: _a, ...view } = user;
      return send(res, 200, view);
    }

    return err(res, 404, 'NOT_FOUND', 'Không tìm thấy');
  });
  server.confirmations = confirmations;
  return server;
}

module.exports = { createServer, VARIANTS, USERS };

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  createServer().listen(port, '0.0.0.0', () => {
    console.log(`Mock API dang chay: http://0.0.0.0:${port}`);
    console.log('Tai khoan: nhanvien / 123456  hoac  admin / admin123');
    console.log('Ma vach thu: 8922000001 (con hang), 8922000002 (sap het), 8922000003 (het hang), 036000291452');
  });
}
