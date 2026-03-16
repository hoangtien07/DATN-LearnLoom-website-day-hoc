# Frontend LearnLoom (SvelteKit)

## 1. Mô tả

Frontend của LearnLoom được xây dựng bằng SvelteKit.

Chức năng chính:

- Hiển thị trang khóa học, học tập, hồ sơ, khu vực giảng viên/quản trị.
- Tích hợp gọi API backend qua Axios.
- Tích hợp Chat AI (Gemini) thông qua backend.

## 2. Yêu cầu

- Node.js 18+
- npm

## 3. Cài đặt

1. Mở terminal tại thư mục frontend.
2. Chạy lệnh:

npm install

## 4. Biến môi trường

Tạo file .env trong thư mục frontend.

Ví dụ:
VITE_API_URL=http://localhost:5000

Ghi chú:

- Nếu không cấu hình VITE_API_URL, frontend sẽ fallback về http://localhost:5000.

## 5. Chạy môi trường development

npm run dev

Frontend mặc định chạy tại:
http://localhost:5173

## 6. Build production

npm run build

## 7. Preview bản build

npm run preview

## 8. Scripts hiện có

- npm run dev: chạy chế độ phát triển.
- npm run build: build production.
- npm run preview: chạy thử bản build.

## 9. Kết nối với backend

- Frontend gọi API thông qua file src/lib/js/api.js.
- Cần backend chạy ổn định và cho phép CORS từ origin frontend.

## 10. Lưu ý khi phát triển

- Cookie/session được gửi kèm API request (withCredentials: true).
- Khi đổi domain deploy, cần cập nhật URL backend và CORS phía server.
