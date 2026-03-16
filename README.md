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
