# LearnLoom - Nền tảng học trực tuyến

## 1. Giới thiệu

LearnLoom là dự án web học trực tuyến gồm:

- Frontend: SvelteKit (giao diện người dùng, trang khóa học, học tập, quản trị, chat AI).
- Backend: Node.js + Express + MongoDB (API khóa học, người dùng, đơn hàng, đánh giá, chat AI, OAuth Google).

Mục tiêu của tài liệu này là giúp bạn chạy dự án local nhanh, hiểu cấu trúc và luồng làm việc FE/BE.

## 2. Kiến trúc tổng quan

- frontend: ứng dụng SvelteKit, chạy mặc định ở cổng 5173.
- server: REST API bằng Express, chạy mặc định ở cổng 5000.
- MongoDB: lưu dữ liệu nghiệp vụ và lịch sử chat.
- Gemini API: xử lý hội thoại AI theo ngữ cảnh khóa học/bài học.

Luồng cơ bản:

1. Frontend gọi API backend qua biến môi trường VITE_API_URL.
2. Backend xử lý nghiệp vụ, truy vấn MongoDB.
3. Các endpoint chat dùng Gemini để stream phản hồi về frontend.

## 3. Cấu trúc thư mục chính

- frontend: mã nguồn giao diện và route SvelteKit.
- server: mã nguồn API, model MongoDB, controller, service.
- server/scripts: script hỗ trợ bảo trì dữ liệu.

## 4. Yêu cầu môi trường

- Node.js: khuyến nghị 18+.
- npm: đi kèm Node.js.
- MongoDB: local hoặc cloud (MongoDB Atlas).

## 5. Chạy nhanh toàn bộ dự án (Development)

Mở 2 terminal riêng:

Terminal 1 (Backend):

1. cd server
2. npm install
3. Tạo file .env theo hướng dẫn tại server/README.md
4. npm run start

Terminal 2 (Frontend):

1. cd frontend
2. npm install
3. Tạo file .env (nếu cần) theo hướng dẫn tại frontend/README.md
4. npm run dev

Sau khi chạy:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 6. Tài liệu chi tiết từng phần

- Hướng dẫn Frontend: frontend/README.md
- Hướng dẫn Backend: server/README.md

## 7. Tính năng chính hiện có

- Quản lý khóa học, bài học, môn học.
- Vai trò người dùng: học viên, giảng viên, quản trị.
- Đăng nhập Google OAuth.
- Chat AI theo ngữ cảnh khóa học/bài học (stream realtime).
- Đánh giá, bình luận, đơn hàng.

## 8. Ghi chú triển khai

- Route OAuth trong backend hiện redirect về http://localhost:5173. Khi deploy cần đổi sang domain thực tế.
- CORS backend hỗ trợ cấu hình qua CLIENT_ORIGINS.
- Chat AI yêu cầu GEMINI_API_KEY, nếu thiếu thì endpoint chat sẽ lỗi 500.


## 4.1. Hướng dẫn cài đặt từ đầu

### Bước 1: Clone mã nguồn

```bash
git clone https://github.com/<your-org-or-username>/LearnLoom-website-day-hoc.git
cd LearnLoom-website-day-hoc
```

### Bước 2: Tạo file môi trường

Tạo file `.env` cho từng phần dựa trên `.env.example`:

- Frontend: copy `frontend/.env.example` thành `frontend/.env`.
- Backend: copy `server/.env.example` thành `server/.env`.

Điền các giá trị thật cho Google OAuth, Gemini API, MongoDB nếu deploy production.

### Bước 3: Cài đặt dependencies

```bash
cd frontend && npm install
cd ../server && npm install
```

### Bước 4: Khởi động hệ thống

Mở 2 terminal:

- Terminal 1 (Backend):
  ```bash
  cd server
  npm run start
  ```
- Terminal 2 (Frontend):
  ```bash
  cd frontend
  npm run dev
  ```

Sau khi chạy:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Bước 5: Kiểm tra các nghiệp vụ chính

- Đăng nhập Google OAuth (nếu đã cấu hình).
- Quản lý khóa học, bài học, đơn hàng, bình luận, đánh giá.
- Chat AI theo ngữ cảnh (nếu đã cấu hình GEMINI_API_KEY).
- Thanh toán đơn hàng qua VNPAY (test).

## 9. Hướng dẫn tích hợp và test thanh toán VNPAY

Hệ thống đã tích hợp demo thanh toán VNPAY ở môi trường Sandbox. Khi test, chỉ dùng thông tin thẻ test dưới đây (không dùng cho khách hàng thật).

**Thông tin thẻ test:**

| Ngân hàng | Số thẻ           | Tên chủ thẻ | Ngày phát hành | Mã OTP |
| --------- | ---------------- | ----------- | -------------- | ------ |
| NCB       | 9704198526194129 | NGUYEN VINA | 07/19          | 123456 |

**URL thanh toán test:**

- https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

**Tài liệu và code mẫu:**

- Tài liệu: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-quay.html
- Code demo: https://sandbox.vnpayment.vn/apis/node-demo/node-demo-tich-hop

**Lưu ý:**

- Khi test, chỉ dùng thẻ test và URL sandbox, không dùng cho giao dịch thật.
- Để tích hợp production, cần đăng ký Merchant và lấy thông tin thật từ VNPAY.

## 10. Hướng dẫn tích hợp Chat AI Gemini

Hệ thống đã tích hợp chat AI Gemini (Google Generative AI) theo ngữ cảnh khóa học/bài học.

- Để sử dụng, cần điền GEMINI_API_KEY vào file `server/.env`.
- Model mặc định: gemini-2.0-flash (có thể đổi qua biến môi trường).
- Chat AI sẽ hoạt động realtime, stream từng chunk về frontend.

**Lưu ý:**

- Nếu thiếu GEMINI_API_KEY, endpoint chat sẽ trả lỗi 500.
- Chỉ dùng key thật cho môi trường production.

## 11. Tham khảo chi tiết từng phần

- Hướng dẫn Frontend: [frontend/README.md](frontend/README.md)
- Hướng dẫn Backend: [server/README.md](server/README.md)

