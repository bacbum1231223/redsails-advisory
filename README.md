# RedSails Advisory

Website demo song ngữ VN/EN với mô hình quản trị 3D và công cụ phác thảo nhiệm vụ.

- Website: https://bacbum1231223.github.io/redsails-advisory/
- Trang chính: `index.html`
- Mô hình riêng: `governance-3d.html`
- Tài nguyên: `assets/`

Đăng bằng GitHub Pages từ nhánh `main`, thư mục `/ (root)`. Không cần bước build.

Luồng tiếp nhận là bản mô phỏng; dữ liệu nhập được xử lý trên thiết bị.

## Bộ công cụ và nguồn mở

- Mở ngay: https://bacbum1231223.github.io/redsails-advisory/?platform=tools#workbench
- Radar: https://bacbum1231223.github.io/redsails-advisory/?platform=radar#workbench
- Báo cáo độc lập: `latest.html` và `latest.json`.
- 18 repository được chia thành 13 nhóm chức năng. Điểm sàng lọc gốc được giữ riêng với metadata GitHub cập nhật.
- Bộ demo trên trình duyệt được giữ riêng. Chọn “Đăng nhập & kết nối máy chủ” để dùng dữ liệu thật trong không gian riêng qua backend Sites RedSails.
- Backend lưu dữ liệu D1, tệp riêng R2, xác thực ChatGPT, phân quyền thành viên, lịch sử máy chủ và kiểm tra phiên bản khi ghi. Cửa sổ kết nối cần mở khi dùng công cụ trên GitHub Pages; có thể mở cùng giao diện tại origin máy chủ.
- Chưa kết nối OCR/AI hoặc nhà cung cấp ký điện tử. Các dự án trong Radar vẫn là công nghệ tham chiếu, không phải 18 runtime đã cài.
- Bản nháp mở rộng dùng khóa `redsails-open-platform/v1`, độc lập với bản nháp mapping cũ.

Chạy bộ quét thủ công với Python 3.10 trở lên, không cần cài thêm thư viện:

```text
python scan_github.py --offline
python scan_github.py
python scan_github.py --discover --per-query 3 --max-extra 24
```

Kết quả được ghi vào `reports/latest.html` và `reports/latest.json`. Có thể nhập JSON vào Radar trên web. Nếu cần tăng hạn mức GitHub API, truyền `GITHUB_TOKEN` bằng biến môi trường; không đưa token vào website hoặc repository. Không có lịch quét tự động được bật.
