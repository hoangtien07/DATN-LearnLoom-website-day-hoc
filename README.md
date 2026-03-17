# LearnLoom — Nền tảng Học Trực Tuyến

> Tài liệu kỹ thuật & hướng dẫn triển khai

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Kiến trúc tổng quan](#2-kiến-trúc-tổng-quan)
3. [Yêu cầu môi trường](#3-yêu-cầu-môi-trường)
4. [Hướng dẫn cài đặt từ đầu](#4-hướng-dẫn-cài-đặt-từ-đầu)
5. [Tính năng chính](#5-tính-năng-chính)
6. [Tích hợp & test thanh toán VNPAY](#6-tích-hợp--test-thanh-toán-vnpay)
7. [Tích hợp Chat AI Gemini](#7-tích-hợp-chat-ai-gemini)
8. [Ghi chú triển khai (Production)](#8-ghi-chú-triển-khai-production)
9. [Tài liệu tham khảo](#9-tài-liệu-tham-khảo)

---

## 1. Giới thiệu

**LearnLoom** là nền tảng học trực tuyến được xây dựng theo kiến trúc client-server hiện đại, cho phép quản lý khóa học, bài học, người dùng và tích hợp AI chat theo ngữ cảnh.

Hệ thống gồm hai thành phần chính:

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| **Frontend** | SvelteKit | Giao diện người dùng, trang khóa học, học tập, quản trị, chat AI |
| **Backend** | Node.js + Express + MongoDB | API khóa học, người dùng, đơn hàng, đánh giá, chat AI, OAuth Google |

Mục tiêu tài liệu này: giúp bạn chạy dự án local nhanh chóng, hiểu rõ cấu trúc và luồng làm việc giữa Frontend và Backend.

---

## 2. Kiến trúc tổng quan

### 2.1. Các thành phần hệ thống

| Thành phần | Cổng mặc định | Mô tả |
|---|---|---|
| **Frontend** (SvelteKit) | `5173` | Ứng dụng giao diện người dùng |
| **Backend** (Express API) | `5000` | REST API xử lý nghiệp vụ |
| **MongoDB** | — | Lưu dữ liệu nghiệp vụ và lịch sử chat |
| **Gemini API** (Google) | — | Xử lý hội thoại AI theo ngữ cảnh khóa học / bài học |

### 2.2. Luồng hoạt động

```
Người dùng
    │
    ▼
Frontend (SvelteKit :5173)
    │  gọi API qua VITE_API_URL
    ▼
Backend (Express :5000)
    │  truy vấn dữ liệu          stream phản hồi AI
    ├──────────────────▶ MongoDB
    └──────────────────▶ Gemini API ──▶ Frontend (realtime)
```

1. **Frontend** gọi API backend qua biến môi trường `VITE_API_URL`.
2. **Backend** xử lý nghiệp vụ, truy vấn MongoDB.
3. Các endpoint `/chat` dùng Gemini để **stream phản hồi** về Frontend theo thời gian thực.

### 2.3. Cấu trúc thư mục chính

```
LearnLoom-website-day-hoc/
├── frontend/               # Mã nguồn giao diện và route SvelteKit
│   ├── .env                # Biến môi trường Frontend (VITE_API_URL, ...)
│   ├── .env.example        # File mẫu biến môi trường
│   └── README.md           # Hướng dẫn chi tiết Frontend
│
├── server/                 # Mã nguồn API, model MongoDB, controller, service
│   ├── .env                # Biến môi trường Backend (MongoDB, Gemini, OAuth, ...)
│   ├── .env.example        # File mẫu biến môi trường
│   ├── scripts/            # Script hỗ trợ bảo trì dữ liệu
│   └── README.md           # Hướng dẫn chi tiết Backend
```

---

## 3. Yêu cầu môi trường

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| **Node.js** | 18+ (khuyến nghị) | Nền tảng chạy Backend và build Frontend |
| **npm** | Đi kèm Node.js | Quản lý gói phụ thuộc |
| **MongoDB** | Local hoặc Atlas | Có thể dùng [MongoDB Atlas](https://www.mongodb.com/atlas) miễn phí cho dev |
| **Gemini API Key** | Tùy chọn | Chỉ cần nếu dùng tính năng Chat AI |

---

## 4. Hướng dẫn cài đặt từ đầu

### Bước 1 — Clone mã nguồn

```bash
git clone https://github.com/<your-org-or-username>/LearnLoom-website-day-hoc.git
cd LearnLoom-website-day-hoc
```

### Bước 2 — Tạo file môi trường

Tạo file `.env` cho từng phần dựa trên file mẫu `.env.example` sẵn có:

```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp server/.env.example server/.env
```

Sau đó mở từng file `.env` và điền các giá trị thực:

| File | Giá trị cần điền |
|---|---|
| `frontend/.env` | `VITE_API_URL` (URL backend) |
| `server/.env` | `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, ... |

> ⚠️ **Không commit file `.env` lên Git.** Đảm bảo `.env` đã có trong `.gitignore`.

### Bước 3 — Cài đặt dependencies

```bash
cd frontend && npm install
cd ../server && npm install
```

### Bước 4 — Khởi động hệ thống

Mở **2 terminal riêng** và chạy:

**Terminal 1 — Backend:**

```bash
cd server
npm run start
```

> ✅ Backend khởi động tại: **http://localhost:5000**

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

> ✅ Frontend khởi động tại: **http://localhost:5173**

### Bước 5 — Kiểm tra nghiệp vụ chính

Sau khi cả hai dịch vụ chạy thành công, kiểm tra các tính năng sau:

- [ ] Đăng nhập Google OAuth (nếu đã cấu hình)
- [ ] Quản lý khóa học, bài học, đơn hàng, bình luận, đánh giá
- [ ] Chat AI theo ngữ cảnh (nếu đã cấu hình `GEMINI_API_KEY`)
- [ ] Thanh toán đơn hàng qua VNPAY (chế độ test)

---

## 5. Tính năng chính

| Tính năng | Mô tả chi tiết |
|---|---|
| **Quản lý nội dung** | Tạo, sửa, xóa khóa học, bài học, môn học |
| **Phân quyền người dùng** | 3 vai trò: Học viên, Giảng viên, Quản trị viên |
| **Đăng nhập Google OAuth** | Xác thực an toàn qua tài khoản Google |
| **Chat AI Realtime** | Hội thoại AI stream theo ngữ cảnh khóa học / bài học sử dụng Gemini |
| **Đánh giá & Bình luận** | Học viên có thể rate và comment khóa học |
| **Thanh toán VNPAY** | Tích hợp VNPAY Sandbox để test đơn hàng |

---

## 6. Tích hợp & test thanh toán VNPAY

Hệ thống đã tích hợp demo thanh toán VNPAY ở môi trường **Sandbox**. Chỉ sử dụng thông tin bên dưới cho mục đích test — **không dùng cho giao dịch thật**.

### 6.1. Thông tin thẻ test

| Ngân hàng | Số thẻ | Tên chủ thẻ | Ngày phát hành | Mã OTP |
|---|---|---|---|---|
| NCB | `9704198526194129` | NGUYEN VAN A | 07/19 | `123456` |

### 6.2. URL và tài liệu

| Loại | Đường dẫn |
|---|---|
| URL thanh toán test | https://sandbox.vnpayment.vn/paymentv2/vpcpay.html |
| Tài liệu API | https://sandbox.vnpayment.vn/apis/docs/thanh-toan-quay.html |
| Code demo Node.js | https://sandbox.vnpayment.vn/apis/node-demo/node-demo-tich-hop |

### 6.3. Lưu ý

- Chỉ dùng thẻ test và URL sandbox trong môi trường phát triển.
- Để tích hợp production, cần **đăng ký Merchant** và lấy thông tin thật từ VNPAY.

---

## 7. Tích hợp Chat AI Gemini

Hệ thống tích hợp **Gemini** (Google Generative AI) để tạo trải nghiệm chat AI theo ngữ cảnh khóa học và bài học, stream từng chunk phản hồi về Frontend theo thời gian thực.

### 7.1. Cấu hình

| Tham số | Giá trị / Mô tả |
|---|---|
| `GEMINI_API_KEY` | Khóa API từ [Google AI Studio](https://aistudio.google.com/) — **Bắt buộc** để Chat hoạt động |
| Model mặc định | `gemini-2.0-flash` |
| Thay đổi model | Qua biến môi trường trong `server/.env` |
| Kết quả nếu thiếu key | Endpoint `/chat` trả về lỗi **HTTP 500** |

### 7.2. Lưu ý bảo mật

> ⚠️ Chỉ dùng Gemini API Key thật cho môi trường **production**.  
> Không commit key vào repository. Luôn đặt trong file `.env` và thêm vào `.gitignore`.

---

## 8. Ghi chú triển khai (Production)

Khi chuyển từ môi trường development sang production, cần cập nhật các hạng mục sau:

| Hạng mục | Hướng dẫn |
|---|---|
| **OAuth Redirect URL** | Thay `http://localhost:5173` bằng domain thực tế trong Google Cloud Console và file `server/.env` |
| **CORS** | Cấu hình biến `CLIENT_ORIGINS` trong `server/.env` với domain frontend thực tế |
| **Gemini API Key** | Bắt buộc có giá trị hợp lệ. Nếu thiếu, máy chủ sẽ báo lỗi 500 ở tất cả endpoint `/chat` |
| **VNPAY** | Đăng ký Merchant, thay URL sandbox bằng URL production VNPAY |
| **Bảo mật `.env`** | Không commit file `.env` vào Git. Thêm vào `.gitignore` |
| **MongoDB** | Dùng MongoDB Atlas hoặc instance riêng với xác thực mạnh cho production |

---

## 9. Tài liệu tham khảo

| Tài liệu | Đường dẫn |
|---|---|
| Hướng dẫn Frontend | [`frontend/README.md`](frontend/README.md) |
| Hướng dẫn Backend | [`server/README.md`](server/README.md) |
| Biến môi trường Frontend mẫu | [`frontend/.env.example`](frontend/.env.example) |
| Biến môi trường Backend mẫu | [`server/.env.example`](server/.env.example) |
| VNPAY Sandbox API | https://sandbox.vnpayment.vn/apis/docs/ |
| Google AI Studio (Gemini) | https://aistudio.google.com/ |
| MongoDB Atlas | https://www.mongodb.com/atlas |
