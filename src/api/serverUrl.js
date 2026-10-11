// Chuan hoa dia chi may chu nguoi dung go vao.
//   "192.168.1.20:8080"        -> "http://192.168.1.20:8080"
//   "http://192.168.1.20:8080/" -> "http://192.168.1.20:8080"
//   "shop.example.com"          -> "https://shop.example.com"
// Tra ve null neu khong hop le.
export function normalizeServerUrl(input) {
  let value = (input || '').trim();
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    // IP / localhost / ten may noi bo dung http, ten mien that dung https
    const isLocal =
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(value) ||
      /^[^./]+(:\d+)?(\/|$)/.test(value) || // ten may noi bo mot tu: "macbook:8080"
      /^[^/]+\.local(:\d+)?(\/|$)/i.test(value); // "macbook-pro.local:8080"
    value = `${isLocal ? 'http' : 'https'}://${value}`;
  }

  try {
    const url = new URL(value);
    if (!url.hostname) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}
