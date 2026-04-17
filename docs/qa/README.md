# 📦 QA Handover — LearnLoom (Full System)

> Tài liệu bàn giao từ đội **BA + Dev** cho đội **QA**.
> Bản: v1.0 · Ngày: 2026-04-18
> **Phạm vi:** Test **toàn bộ dự án LearnLoom** (không chỉ các BR mới thêm).

## 1. Mục lục

1. [Tổng quan hệ thống](#2-tổng-quan-hệ-thống)
2. [Phạm vi test đầy đủ](#3-phạm-vi-test-đầy-đủ)
3. [Môi trường test](#4-môi-trường-test)
4. [Seed dữ liệu test](#5-seed-dữ-liệu-test)
5. [Ma trận module ↔ test case](#6-ma-trận-module--test-case)
6. [Known limitations (out-of-scope)](#7-known-limitations)
7. [Exit criteria](#8-exit-criteria)
8. [Tài liệu liên quan](#9-tài-liệu-liên-quan)
9. [Liên hệ](#10-liên-hệ)

---

## 2. Tổng quan hệ thống

**LearnLoom** là nền tảng học trực tuyến (DATN):
- **FE:** SvelteKit · port 5173
- **BE:** Node.js + Express + MongoDB · port 5000
- **Tích hợp:** Google OAuth, VNPay Sandbox, Gemini AI (chat)
- **3 vai trò:** Student · Instructor · Admin

### Kiến trúc luồng test chính

```
Guest → OAuth Google → Student
  ↓
Duyệt catalog → Enroll (free hoặc VNPay) → Học bài → Quiz → Review → Chat AI
  ↓
(Nếu student apply) → Admin duyệt → Instructor → Tạo course → Gửi duyệt → Admin approve → Published
```

---

## 3. Phạm vi test đầy đủ

### 3.1. Modules in-scope — toàn bộ hệ thống

| # | Module | Các chức năng |
|---|--------|---------------|
| M1 | **Authentication** | Google OAuth login, session, logout, current_user endpoint |
| M2 | **Course catalog** | List (pagination), filter (subject, level, price, duration), search, detail page |
| M3 | **Course detail page** | Thông tin, curriculum, reviews, enroll CTA, recommend courses |
| M4 | **Enrollment** | Free course (direct enroll), Paid course (VNPay flow) |
| M5 | **Learning** | Video lesson (YouTube), Text lesson, Audio lesson, Live lesson, progress tracking, resume |
| M6 | **Quiz / Assignment** | Start, submit, retake, view results, **BR-12/14** anti-cheat |
| M7 | **Reviews** | Create / update / delete, avg rating, **BR-10 progress gate**, **BR-11 unique** |
| M8 | **Chat AI** | Context-aware stream (lesson/course), history, clear, delete message, **BR-17 guest quota** |
| M9 | **Student profile** | Thông tin cá nhân, learning path, favorites, **Lịch sử mua hàng (BR-05)** |
| M10 | **Instructor workflow** | Dashboard, tạo course, quản lý sections/items, publish (**BR-20**), xem student, earnings, đăng ký làm GV (**BR-03**) |
| M11 | **Admin workflow** | Quản lý users, courses (+deleted), subjects, orders, **duyệt GV (BR-03)**, **duyệt course (BR-20)** |
| M12 | **Comments** | Comment lesson, reply |
| M13 | **Access control** | Lesson content gating (**BR-01**), owner check, role check |
| M14 | **VNPay integration** | Create URL, return callback, IPN webhook, idempotent retry |
| M15 | **Security baseline (P0/P1)** | Rate-limit, field whitelist, session guard, audit log |
| M16 | **Responsive UI** | Mobile, tablet, desktop |
| M17 | **Cross-browser** | Chrome, Firefox, Edge (min) |

### 3.2. Test types cần cover

| Type | Focus | % effort |
|------|-------|----------|
| Functional (happy + alt path) | Mỗi module có chạy đúng spec | 50% |
| Security | Access control, content leak, role escalation, input validation | 15% |
| Authorization | Quyền hạn mỗi role, isolation giữa các user | 10% |
| Integration | VNPay callback, Gemini streaming, OAuth flow | 10% |
| Regression | Các feature cũ không break sau refactor | 5% |
| Performance | Rate-limit, quota, pagination với nhiều data | 5% |
| Usability / UI / UX | Responsive, error messages, loading states | 5% |

---

## 4. Môi trường test

### 4.1. Yêu cầu

- Node.js ≥ 18 · npm đi kèm
- MongoDB local hoặc Atlas
- Chrome (primary), Firefox, Edge
- Postman (hoặc tương đương)
- Google account để test OAuth (tối thiểu 2 gmail khác nhau để test cross-user)

### 4.2. Setup backend

```bash
cd server
cp .env.example .env
# Điền:
#   MONGO_URI=mongodb://127.0.0.1:27017/learnloom_qa
#   SESSION_SECRET=<random 32 ký tự>
#   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (tạo ở Google Cloud Console)
#   GEMINI_API_KEY (từ aistudio.google.com)
#   VNPAY_TMN_CODE=<sandbox>
#   VNPAY_HASH_SECRET=<sandbox>
npm install
npm run start
# Log ra: Server running on port 5000
```

### 4.3. Setup frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000
npm install
npm run dev
# Truy cập http://localhost:5173
```

### 4.4. Biến môi trường hữu ích cho QA

| Biến | Giá trị QA gợi ý | Mục đích |
|------|------------------|----------|
| `LOG_LEVEL` | `debug` | Xem full log backend |
| `GUEST_CHAT_DAILY_QUOTA` | `3` | Test BR-17 nhanh |
| `REVIEW_MIN_PROGRESS_PERCENT` | `20` | Test BR-10 nhanh |

### 4.5. Thẻ test VNPay Sandbox

| Ngân hàng | Số thẻ | Chủ thẻ | Ngày PH | OTP |
|-----------|--------|---------|---------|-----|
| NCB | `9704198526194129` | NGUYEN VAN A | 07/19 | `123456` |

---

## 5. Seed dữ liệu test

Máy QA kéo code về lần đầu → DB rỗng → chạy **1 lệnh** là có đủ data cho mọi test case.

```bash
cd server
npm install                                    # chỉ cần lần đầu
cp .env.example .env && chỉnh MONGO_URI / SESSION_SECRET / ...

node scripts/seedTestData.js                   # dry-run — xem kế hoạch (không cần Mongo chạy)
node scripts/seedTestData.js --apply           # thực sự tạo
node scripts/seedTestData.js --apply --purge   # xoá QA data cũ rồi tạo lại (reset về baseline)
```

### Sau khi seed — 8 tài khoản

| Role | Email | Đặc điểm phục vụ test |
|------|-------|----------------------|
| Admin | `admin.qa@learnloom.test` | Vào mọi module admin |
| Instructor 1 | `instructor1.qa@learnloom.test` | Owner `test-js-basic`, `test-react-advanced` |
| Instructor 2 | `instructor2.qa@learnloom.test` | Owner 4 course còn lại (draft/pending/rejected/free) |
| Student 1 | `student1.qa@learnloom.test` | Enrolled `test-js-basic` @ **60%** · đã review · có 3 order (success/pending/fail) |
| Student 2 | `student2.qa@learnloom.test` | Enrolled `test-js-basic` @ **20%** (test BR-10 progress chưa đủ) |
| Student 3 | `student3.qa@learnloom.test` | Chưa enroll gì (test BR-01 khoá content, nộp đơn GV fresh) |
| Student 4 | `student4.qa@learnloom.test` | Có đơn đăng ký GV **PENDING** (admin duyệt) |
| Student 5 | `student5.qa@learnloom.test` | Có đơn đăng ký GV **REJECTED** kèm reason |

### Sau khi seed — 6 khóa học

| Slug | Giá | Trạng thái | Phục vụ test |
|------|-----|------------|--------------|
| `test-js-basic` | 199 000đ | approved · published | BR-01/05/10/11/12/14 · có 5 lesson (preview + text + video + audio + live) + 3 quiz (timer bình thường / no-retake / timer 1 phút cho TIMER_EXPIRED) |
| `test-react-advanced` | 499 000đ | approved · published | Filter catalog, cross-course |
| `test-css-draft` | 99 000đ | **none** · draft | BR-20 submit duyệt lần đầu |
| `test-html-pending` | 79 000đ | **pending** · draft | BR-20 admin duyệt |
| `test-ui-rejected` | 89 000đ | **rejected** + reason | BR-20 xem reason & gửi lại |
| `test-free-html` | **0đ** | approved · published | M4 enroll free flow |

Script tạo thêm: 4 subjects, 2 comments mẫu, 1 review 5⭐ của student1.

### ⚠️ Authentication — vì hệ thống chỉ hỗ trợ Google OAuth

Có 2 lựa chọn, tuỳ kịch bản test:

**Cách 1 — UI E2E test (khuyến nghị):**
1. Mở `server/scripts/seedTestData.js`, đổi `email` của các user QA sang Gmail thật tester sở hữu (tối thiểu `admin.qa` và 2-3 student).
2. Chạy `node scripts/seedTestData.js --apply --purge`.
3. Trên browser, login OAuth bằng Gmail tương ứng → hệ thống tự link `googleId` thật với user đã seed và giữ `role` đã set.

**Cách 2 — API test nhanh (dev shortcut, không cần đổi email):**
1. Login OAuth 1 Gmail bất kỳ → DB tạo user role=student.
2. Mở MongoDB Compass → tìm user vừa tạo → sửa `role` thành `admin` hoặc `instructor` tuỳ scope test.
3. Copy cookie `connect.sid` từ browser DevTools → paste vào Postman.

**Cách 3 — API test với user seed sẵn:**
Nếu tester chỉ test API qua Postman/curl và không quan tâm session, có thể gọi endpoint `PUT /api/users/:userId` từ admin session để flip role bất kỳ user nào — hoặc gán trực tiếp trong MongoDB.

---

## 6. Ma trận module ↔ test case

Chi tiết trong [`TEST_CASES.md`](TEST_CASES.md). Tóm tắt:

| Module | Test Case IDs | Count | P1 | P2 | P3 |
|--------|---------------|-------|----|----|----|
| M1 Authentication | TC-M1-01 → TC-M1-05 | 5 | 3 | 2 | 0 |
| M2 Catalog | TC-M2-01 → TC-M2-08 | 8 | 5 | 2 | 1 |
| M3 Detail page | TC-M3-01 → TC-M3-05 | 5 | 3 | 2 | 0 |
| M4 Enrollment | TC-M4-01 → TC-M4-07 | 7 | 6 | 1 | 0 |
| M5 Learning | TC-M5-01 → TC-M5-08 | 8 | 5 | 3 | 0 |
| M6 Quiz (BR-12/14) | TC-01-01 → TC-12-06 / TC-14-03 | 9 | 7 | 2 | 0 |
| M7 Reviews (BR-10/11) | TC-10-01 → TC-11-03 | 8 | 7 | 1 | 0 |
| M8 Chat AI (BR-17) | TC-M8-01 → TC-17-03 | 7 | 5 | 2 | 0 |
| M9 Student profile | TC-M9-01 → TC-05-05 | 8 | 5 | 3 | 0 |
| M10 Instructor | TC-M10-01 → TC-03-07 | 12 | 8 | 3 | 1 |
| M11 Admin | TC-M11-01 → TC-20-08 | 15 | 10 | 4 | 1 |
| M12 Comments | TC-M12-01 → TC-M12-03 | 3 | 2 | 1 | 0 |
| M13 Access control (BR-01) | TC-01-01 → TC-01-08 | 8 | 7 | 1 | 0 |
| M14 VNPay integration | TC-M14-01 → TC-M14-06 | 6 | 6 | 0 | 0 |
| M15 Security baseline | TC-M15-01 → TC-M15-08 | 8 | 6 | 2 | 0 |
| M16 Responsive UI | TC-M16-01 → TC-M16-04 | 4 | 2 | 2 | 0 |
| M17 Cross-browser | TC-M17-01 → TC-M17-03 | 3 | 2 | 1 | 0 |
| **TOTAL** | — | **~124** | **89** | **32** | **3** |

---

## 7. Known limitations

Đội Dev đã confirm các chức năng sau **không implement** trong scope DATN — QA không cần log bug:

| Module | Trạng thái | Trong slide hạn chế DATN |
|--------|-----------|--------------------------|
| Certificate PDF sau khi hoàn thành course | ❌ Chưa có | ✅ |
| Refund / khiếu nại đơn hàng | ❌ Chưa có | ✅ |
| Cart (mua nhiều khóa 1 lần) | ❌ Chưa có | ✅ |
| File assignment (nộp file, chấm tay) | ❌ Model chỉ hỗ trợ quiz | ✅ |
| Video upload nội bộ (instructor chỉ nhập YouTube URL) | ❌ Chưa có CDN | ✅ |
| Notification (email/in-app khi có reply, course approved) | ❌ Chưa có | ✅ |
| Drag-drop reorder section/lesson | ❌ Route comment-out | ✅ |
| Advanced quiz (randomize, question bank) | ❌ Chưa có | ✅ |
| Admin analytics dashboard (revenue, engagement) | ❌ Chỉ có list basic | ✅ |
| Social login ngoài Google (Facebook, email/password) | ❌ Chỉ Google OAuth | ✅ |
| Instructor KYC / verification chứng chỉ thật | ❌ Chỉ duyệt theo motivation | ✅ |
| i18n (đa ngôn ngữ) | ❌ Hardcode tiếng Việt | ✅ |
| Accessibility audit (ARIA, screen reader) | ❌ Chưa check | ⚠️ Nên test cơ bản nếu có thời gian |

Bug khác với các điểm trên mới log vào tracker.

---

## 8. Exit criteria

Sprint test hoàn thành khi:

### Bắt buộc
- [ ] **≥ 95% test case P1** đạt trạng thái Pass.
- [ ] **≥ 85% test case P2** đạt Pass.
- [ ] **0 bug Critical** chưa close.
- [ ] **0 bug High** chưa close (hoặc đã có hotfix merged).
- [ ] **Security checklist** pass 100% (xem [`TEST_CASES.md`](TEST_CASES.md) mục Security).
- [ ] **Smoke test** sau mỗi hotfix đều pass.

### Khuyến nghị
- [ ] ≥ 70% test case P3 Pass.
- [ ] Demo flow end-to-end cho 2 persona chính (student + instructor) không có lỗi chặn.
- [ ] Accessibility check cơ bản (Tab navigation, alt text, contrast).

### Phân loại bug severity

| Severity | Định nghĩa | Ví dụ |
|----------|-----------|-------|
| **Critical** | Chặn luồng chính · Lộ secret/content · Data loss · Sai business rule cốt lõi | Guest thấy videoUrl; submit quiz bypass timer; admin publish course không set is_published |
| **High** | Chặn luồng phụ · Sai logic quan trọng · Trả sai HTTP status | Review tạo được khi progress 0%; enrolled user không xem được video; pagination trả duplicate |
| **Medium** | Sai UI/UX, có workaround · Missing validation trên edge case | Badge hiển thị sai label; message lỗi không rõ; form không disable button khi đang submit |
| **Low** | Cosmetic · Typo · Alignment | Spacing, font, màu nút |

---

## 9. Tài liệu liên quan

| File | Mục đích |
|------|----------|
| [`TEST_CASES.md`](TEST_CASES.md) | ~127 test case cho toàn hệ thống |
| [`API_CHEATSHEET.md`](API_CHEATSHEET.md) | Curl + Postman examples |
| [`BUG_REPORT_TEMPLATE.md`](BUG_REPORT_TEMPLATE.md) | Template khi log bug |
| [`../../README.md`](../../README.md) | README gốc: kiến trúc, cài đặt |
| [`../../server/scripts/seedTestData.js`](../../server/scripts/seedTestData.js) | Script seed data QA — dùng lại mỗi khi reset DB |

---

## 10. Liên hệ

| Vai trò | Tên | Phụ trách | SLA phản hồi |
|---------|-----|-----------|--------------|
| Lead Manager | Hùng | Escalate blocker, xin mở rộng scope | 4h |
| BA | Linh | Clarify business rule, update AC | 4h |
| Dev | Tiến | Hotfix, debug env, API mới | 8h |
| QA Lead | Trang | Chủ trì test, triage bug | — |

Kênh chính: **Jira** (ticket) + **Slack #learnloom-qa** (chat realtime).

---

_Cuối tài liệu. Câu hỏi business rule → Linh · Lỗi kỹ thuật / env → Tiến · Ticket tracking → Trang._
