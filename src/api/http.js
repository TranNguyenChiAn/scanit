// HTTP client dung chung cho app. Khong phu thuoc React Native de co the chay thu bang Node.
//
//   const http = createHttp({ getBaseUrl, getToken, onUnauthorized });
//   const data = await http.get('/api/product-variants/search', { search: '123' });

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // NETWORK: khong ket noi duoc, TIMEOUT: qua lau, UNAUTHORIZED: het phien / sai mat khau,
    // FORBIDDEN: khong du quyen, SERVER: loi 5xx, HTTP: loi khac
    this.code = code;
  }
}

function buildQuery(params) {
  if (!params) return '';
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

// Tai tep len bang XMLHttpRequest: fetch moi cua Expo (SDK 54+) khong nhan phan tep dang { uri, name, type }
// cua React Native ("Unsupported FormDataPart implementation"), con XHR cua RN thi nhan.
// Tra ve doi tuong giong Response (ok, status, text()).
function xhrFetch(url, { method, headers, body, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abortError = () => Object.assign(new Error('Aborted'), { name: 'AbortError' });
    xhr.open(method, url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () =>
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, text: async () => xhr.responseText || '' });
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.onabort = () => reject(abortError());
    if (signal) {
      if (signal.aborted) return reject(abortError());
      signal.addEventListener('abort', () => xhr.abort());
    }
    xhr.send(body);
  });
}

export function createHttp({
  getBaseUrl,
  getToken = async () => null,
  onUnauthorized = () => {},
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = 10000,
}) {
  async function currentBaseUrl() {
    return (await getBaseUrl())?.replace(/\/+$/, '') || null;
  }

  async function request(method, path, { params, body, auth = true, timeoutMs: callTimeout } = {}) {
    const baseUrl = await currentBaseUrl();
    if (!baseUrl) {
      throw new ApiError('Chưa cài địa chỉ máy chủ.', { code: 'NETWORK' });
    }

    // FormData (tai anh len): de fetch tu dat Content-Type kem boundary
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = { Accept: 'application/json' };
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = await getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), callTimeout || timeoutMs);

    let res;
    try {
      const target = `${baseUrl}${path}${buildQuery(params)}`;
      const init = {
        method,
        headers,
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
        signal: controller.signal,
      };
      res = isForm && typeof XMLHttpRequest !== 'undefined' ? await xhrFetch(target, init) : await fetchImpl(target, init);
    } catch (e) {
      if (e?.name === 'AbortError') {
        throw new ApiError('Máy chủ phản hồi quá lâu. Kiểm tra mạng và thử lại.', { code: 'TIMEOUT' });
      }
      // Kem ly do goc (vd "Network request failed") de de tim nguyen nhan khi tai anh that bai
      const reason = e?.message ? ` (${String(e.message).slice(0, 80)})` : '';
      throw new ApiError(`Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ máy chủ.${reason}`, { code: 'NETWORK' });
    } finally {
      clearTimeout(timer);
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (res.ok) return data;

    // Backend tra { message } khi loi (vd. "Mat khau khong chinh xac"); rieng AccountStatusFilter
    // tra chuoi thuong ("Tai khoan cua ban da bi khoa") nen lay ca dang nay.
    const plainText = data === null && text && text.length < 200 ? text : undefined;
    const serverMessage = data?.message || plainText;

    // BE moi: 401 = thieu/het han/sai token (hoac sai mat khau khi dang nhap), 403 = khong du quyen.
    // Chi 401 moi dua nguoi dung ve man hinh dang nhap; 403 chi bao loi.
    if (res.status === 401) {
      if (auth) onUnauthorized();
      const fallback = auth ? 'Phiên đăng nhập đã hết hạn. Đăng nhập lại.' : 'Thông tin đăng nhập không đúng.';
      throw new ApiError(serverMessage || fallback, { status: 401, code: 'UNAUTHORIZED' });
    }
    if (res.status === 403) {
      throw new ApiError(serverMessage || 'Bạn không có quyền thực hiện thao tác này.', { status: 403, code: 'FORBIDDEN' });
    }
    if (res.status >= 500) {
      throw new ApiError(serverMessage || 'Máy chủ đang gặp lỗi. Thử lại sau.', { status: res.status, code: 'SERVER' });
    }
    throw new ApiError(serverMessage || `Yêu cầu thất bại (${res.status}).`, { status: res.status, code: 'HTTP' });
  }

  return {
    get: (path, params, opts) => request('GET', path, { ...opts, params }),
    post: (path, body, opts) => request('POST', path, { ...opts, body }),
    put: (path, body, opts) => request('PUT', path, { ...opts, body }),
    patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
    del: (path, opts) => request('DELETE', path, opts),
    // Tai tep len (multipart). Mac dinh cho 30s vi anh co the nang.
    postForm: (path, formData, opts) => request('POST', path, { timeoutMs: 30000, ...opts, body: formData }),
    // Dia chi may chu hien tai, de ghep URL anh tuong doi (/media/...) do BE tra ve.
    baseUrl: currentBaseUrl,
  };
}
