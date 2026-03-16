# Backend LearnLoom (Node.js + Express + MongoDB)

## 1. Mô tả

Backend cung cấp API cho hệ thống LearnLoom:

- Quản lý khóa học, môn học, người dùng, đánh giá, bình luận, đơn hàng.
- Xác thực Google OAuth với Passport.
- Chat AI theo ngữ cảnh học tập bằng Gemini (stream realtime).

## 2. Yêu cầu

- Node.js 18+
- npm
- MongoDB (local hoặc cloud)

## 3. Cài đặt

1. Mở terminal tại thư mục server.
2. Chạy lệnh:

npm install

## 4. Cấu hình biến môi trường

Tạo file .env trong thư mục server.

Ví dụ:
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/learnloom
SESSION_SECRET=your_session_secret
CLIENT_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
CHAT_HISTORY_LIMIT=20
CHAT_MAX_MESSAGE_LENGTH=4000

Giải thích nhanh:

- PORT: cổng backend.
- MONGO_URI: chuỗi kết nối MongoDB.
- SESSION_SECRET: khóa mã hóa session.
- CLIENT_ORIGINS: danh sách origin FE được phép CORS (ngăn cách bằng dấu phẩy).
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: dùng cho đăng nhập Google.
- GEMINI_API_KEY: bắt buộc nếu dùng chat AI.
- GEMINI_MODEL: model Gemini mặc định.
- CHAT_HISTORY_LIMIT: số tin nhắn lịch sử gửi vào ngữ cảnh AI.
- CHAT_MAX_MESSAGE_LENGTH: giới hạn độ dài tin nhắn người dùng.

## 5. Chạy development

npm run start

Backend mặc định chạy tại:
http://localhost:5000

## 6. Scripts hiện có

- npm run start: chạy server bằng nodemon.
- npm run backfill:duration: kiểm tra cập nhật thời lượng khóa học (dry run).
- npm run backfill:duration:apply: áp dụng cập nhật thời lượng khóa học.

## 7. API base path

Các nhóm API chính:

- /auth
- /api/courses
- /api/reviews
- /api/comments
- /api/users
- /api/orders
- /api/subjects
- /api/chat
- /api/teacher

## 8. Lưu ý quan trọng

- Route OAuth hiện redirect cứng về http://localhost:5173 trong authRoutes.js.
  Khi deploy production, cần đổi sang domain frontend thực tế.
- Nếu thiếu GEMINI_API_KEY, endpoint chat sẽ không hoạt động.
- Cần đảm bảo frontend và backend cùng cấu hình CORS + cookie/session nhất quán.
