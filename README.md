# ScanIt

Ứng dụng di động (Expo / React Native) cho nhân viên cửa hàng quần áo: đăng nhập, quét mã vạch và xem chi tiết sản phẩm (giá, tồn kho, màu/size, ảnh) từ API của repo backend `scanit-api` (repo riêng; app này chỉ gọi API).

> Quét bằng ảnh cần backend `scanit-api` bật pgvector và chạy dịch vụ `recognizer` (xem README repo đó). Máy chủ giả lập chỉ trả kết quả mẫu, không nhận diện thật.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/` | Code app (api, auth, màn hình, tiện ích) |
| `tools/mock-api/` | Máy chủ giả lập backend để thử app khi chưa chạy backend |
| `tests/` | 30 test cho lớp API (`npm test`) |

## Cài đặt (chạy trên Mac của bạn)

```bash
npm install
npx expo install --fix
```

Lệnh thứ hai chỉnh mọi gói về đúng phiên bản SDK 57. Luôn chạy sau `npm install`.

## Chạy thử bằng máy chủ giả lập (không cần BE)

Terminal 1:

```bash
npm run mock-api
```

Terminal 2:

```bash
npx expo start -c
```

Mở app bằng Expo Go trên iPhone (cùng Wi-Fi với Mac). Ở màn hình đăng nhập nhập **địa chỉ máy chủ** là IP LAN của Mac, ví dụ `192.168.1.20:8080` (xem IP: `ipconfig getifaddr en0`). Không dùng `localhost` vì đó là chính chiếc iPhone.

| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| `nhanvien` | `123456` | EMPLOYEE |
| `admin` | `admin123` | ADMIN |

Mã vạch thử: `8922000001` (còn 12), `8922000002` (sắp hết), `8922000003` (hết hàng), `036000291452` (UPC-A). Mã khác sẽ ra màn hình "Không tìm thấy".

## Chạy với backend thật

Backend là repo `scanit-api` (Spring Boot, xem README của repo đó). Chạy xong, nhập địa chỉ `IP-của-Mac:8080` ở màn hình đăng nhập, dùng `nhanvien / 123456` (khi bật `SEED_DEV_DATA=true`). Có thể đặt sẵn địa chỉ: `EXPO_PUBLIC_API_URL=http://192.168.1.20:8080 npx expo start -c`.

Ghi chú mạng:
- iOS: `app.json` đã bật `NSAllowsLocalNetworking`, cho phép `http://` tới địa chỉ mạng nội bộ. Máy chủ ngoài Internet phải dùng `https://`.
- Android (Expo Go) cho phép http. Bản build riêng cần bật cleartext traffic.

## Quét bằng ảnh

Chọn tab **Ảnh** ở màn hình quét, đặt cả sản phẩm vào giữa, bấm nút chụp. Ảnh gửi lên `POST /api/scan/image`:
- Rất giống (backend báo `confident`) → mở thẳng chi tiết sản phẩm.
- Chưa chắc → danh sách tối đa 5 gợi ý kèm % giống, nhân viên chọn đúng (lựa chọn được gửi về backend để đo độ chính xác).
- Không nhận ra → gợi ý chụp lại hoặc quét mã vạch.

Với máy chủ giả lập, nội dung ảnh không có ý nghĩa; app vẫn chạy đủ luồng (2 gợi ý mẫu).

## Hành vi cần biết

- 401 = hết phiên (về màn hình đăng nhập). 403 = thiếu quyền (chỉ báo lỗi, không đăng xuất).
- Backend tra mã vạch chính xác và lo cả trường hợp iOS báo UPC-A thành EAN-13 có số 0 đầu.
- Lỗi mạng hiện ngay trên màn hình quét kèm nút "Quét lại", không nhầm với "Không tìm thấy sản phẩm".
- App không hiển thị giá vốn (`costPrice`), kể cả khi tài khoản có quyền xem.
- Chi tiết sản phẩm hiện giá lẻ/sỉ, tồn kho và các màu/size khác của cùng mẫu.
- Token lưu trong `expo-secure-store`.

## Kiểm thử

```bash
npm test
```

Chạy lớp API thật trong `src/api/` với máy chủ giả lập. Mock được viết theo hợp đồng API của `scanit-api` nên chưa chứng minh backend thật chạy đúng.
