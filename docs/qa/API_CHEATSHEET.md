# 🧪 API Cheatsheet — LearnLoom

> Curl + Postman examples cho các endpoint quan trọng.
> Base URL: `http://localhost:5000` (local)
> Auth: Passport session (cookie `connect.sid`) — login qua `GET /auth/google`.

## Quy ước

- `{BASE}` = `http://localhost:5000`
- `{COOKIE}` = giá trị cookie `connect.sid` sau khi login (dùng `-b` cho curl)
- Placeholder như `{courseSlug}`, `{userId}`, `{orderId}` thay bằng giá trị thật

Cho Postman: đăng nhập Google OAuth một lần trong browser, copy cookie `connect.sid` từ DevTools → Application → Cookies, paste vào Postman `Cookies` cho domain `localhost`.

---

## 🔐 Auth

### Get current user
```bash
curl -b "connect.sid={COOKIE}" {BASE}/auth/current_user
```
Response:
```json
{ "_id": "...", "username": "...", "email": "...", "role": "student|instructor|admin" }
```
Guest nhận `null` (200).

---

## 📚 Courses

### List courses (pagination)
```bash
curl "{BASE}/api/courses?page=1&limit=20&subjects=Lập%20trình&levels=Cơ%20bản"
```
Response:
```json
{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
```

### Get course by slug (response có `viewerAccess`)
```bash
curl -b "connect.sid={COOKIE}" {BASE}/api/courses/{courseSlug}
```

### Get lesson detail (BR-01 — có auth middleware)
```bash
# Guest hoặc chưa enroll khóa trả phí → 401/403
curl {BASE}/api/courses/items/lesson/{lessonId}

# Student đã enroll → 200
curl -b "connect.sid={COOKIE}" {BASE}/api/courses/items/lesson/{lessonId}
```

---

## 💳 Orders

### Tạo order
```bash
curl -X POST -b "connect.sid={COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "{courseId}", "redirectUrl": "http://localhost:5173/course/{slug}"}' \
  {BASE}/api/orders/create
```

### Khởi tạo URL VNPay
```bash
curl -X POST -b "connect.sid={COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "{orderId}"}' \
  {BASE}/api/orders/payment/create-vnpay-url
```
Response trả `paymentUrl` — copy vào browser, thanh toán bằng thẻ sandbox NCB (xem [README.md](README.md#34-thẻ-test-vnpay-sandbox)).

### Lịch sử đơn hàng của student (BR-05)
```bash
curl -b "connect.sid={COOKIE}" "{BASE}/api/orders/mine?page=1&limit=10&status=success"
```
`status` ∈ `pending | success | fail` (optional, không filter nếu bỏ trống).

---

## ⭐ Reviews

### Tạo review (BR-10/11)
```bash
curl -X POST -b "connect.sid={COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "Khóa học rất hay"}' \
  {BASE}/api/reviews/{courseId}/{userId}
```
Responses quan trọng:
- `201` — tạo thành công
- `403 NOT_ENROLLED` — chưa enroll
- `403 PROGRESS_INSUFFICIENT` — progress < 50%
- `409 REVIEW_ALREADY_EXISTS` — đã có review (body trả `existingReviewId`)

### Update review
```bash
curl -X PUT -b "connect.sid={COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{"rating": 4, "comment": "Cập nhật"}' \
  {BASE}/api/reviews/{reviewId}
```

---

## 📝 Quiz (BR-12/14)

### Bắt đầu làm bài
```bash
curl -X POST -b "connect.sid={COOKIE}" \
  {BASE}/api/courses/assignments/{assignmentId}/start
```
Response:
```json
{
  "assignmentId": "...",
  "startedAt": "2026-04-18T10:00:00Z",
  "deadline": "2026-04-18T10:05:00Z",
  "timerMinutes": 5,
  "attempt": 1,
  "maxAttempts": 2,
  "questions": [
    {
      "_id": "q1",
      "questionText": "2 + 2 = ?",
      "options": [{"_id": "o1", "text": "3"}, {"_id": "o2", "text": "4"}]
    }
  ]
}
```
⚠️ Để ý: `options[].isCorrect` **KHÔNG có** — đã strip (BR-14).

### Nộp bài
```bash
curl -X POST -b "connect.sid={COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      { "questionId": "q1", "selectedOptions": [{ "userAnswer": "4" }] }
    ]
  }' \
  {BASE}/api/courses/assignments/{assignmentId}/submit
```
Responses:
- `200` + `isFinal: false` → còn retake, **KHÔNG** có `correctAnswer` trong response.
- `200` + `isFinal: true` → hết retake, trả `correctAnswer` + `explanation`.
- `408 TIMER_EXPIRED` — quá giờ.
- `400 NOT_STARTED` — chưa gọi start.
- `409 ASSIGNMENT_COMPLETED` — đã final trước đó.

---

## 💬 Chat AI (BR-17)

### Stream chat (SSE)
```bash
curl -N -X POST -b "connect.sid={COOKIE}" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "Giải thích cho tôi về closure trong JavaScript",
    "sessionKey": "qa-session-1",
    "courseSlug": "{courseSlug}",
    "itemType": "lesson"
  }' \
  {BASE}/api/chat/stream
```
Guest vượt quota → `429 GUEST_QUOTA_EXCEEDED`:
```json
{ "code": "GUEST_QUOTA_EXCEEDED", "quota": 5, "used": 5, "message": "..." }
```

---

## 👨‍🏫 Instructor Application (BR-03)

### Student nộp đơn
```bash
curl -X POST -b "connect.sid={COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "expertise": "Lập trình web",
    "motivation": "Em có 5 năm kinh nghiệm, muốn chia sẻ với cộng đồng...",
    "credentialsUrl": "https://example.com/cv.pdf"
  }' \
  {BASE}/api/instructor-applications
```
Lỗi thường gặp:
- `400 ALREADY_PRIVILEGED` — user đã là instructor/admin
- `409 APPLICATION_PENDING` — đã có đơn chờ duyệt

### User xem đơn của mình
```bash
curl -b "connect.sid={COOKIE}" {BASE}/api/instructor-applications/mine
```

### Admin: list đơn
```bash
curl -b "connect.sid={ADMIN_COOKIE}" \
  "{BASE}/api/instructor-applications?status=pending&page=1&limit=20"
```

### Admin: duyệt
```bash
curl -X PUT -b "connect.sid={ADMIN_COOKIE}" \
  {BASE}/api/instructor-applications/{id}/approve
```

### Admin: từ chối
```bash
curl -X PUT -b "connect.sid={ADMIN_COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{"rejectionReason": "Hồ sơ chưa có chứng chỉ phù hợp"}' \
  {BASE}/api/instructor-applications/{id}/reject
```

---

## 🏫 Course Moderation (BR-20)

### Instructor: gửi duyệt (cùng endpoint với publish cũ)
```bash
curl -X PUT -b "connect.sid={COOKIE}" \
  {BASE}/api/courses/{courseSlug}/publish
```
Response có `reviewStatus`:
- `"pending"` — instructor lần đầu gửi duyệt.
- `"approved"` — course đã từng approved, giờ publish ngay.
- Nếu `reviewStatus === "pending"` và gọi lại → `409 REVIEW_PENDING`.

### Admin: list pending
```bash
curl -b "connect.sid={ADMIN_COOKIE}" \
  "{BASE}/api/courses/admin/pending-review?page=1&limit=20"
```

### Admin: duyệt
```bash
curl -X PUT -b "connect.sid={ADMIN_COOKIE}" \
  {BASE}/api/courses/{courseSlug}/review/approve
```

### Admin: từ chối
```bash
curl -X PUT -b "connect.sid={ADMIN_COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{"rejectionReason": "Thiếu bài tập thực hành phần 3"}' \
  {BASE}/api/courses/{courseSlug}/review/reject
```

---

## 👥 Users

### Admin: list users (paginated)
```bash
curl -b "connect.sid={ADMIN_COOKIE}" "{BASE}/api/users?page=1&limit=20"
```

### User tự update profile (self)
```bash
curl -X PUT -b "connect.sid={COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{"username": "NickMới", "bio": "About me"}' \
  {BASE}/api/users/{userId}
```
⚠️ Chỉ các field trong whitelist được chấp nhận: `username, thumbnail, bio, phone, birthday, facebookUrl, instaUrl, youtubeUrl, websiteUrl`. Gửi `role` khi self-update → BE bỏ qua (không crash).

### Admin: update user + đổi role
```bash
curl -X PUT -b "connect.sid={ADMIN_COOKIE}" \
  -H "Content-Type: application/json" \
  -d '{"role": "instructor"}' \
  {BASE}/api/users/{userId}
```
Admin KHÔNG được đổi role của chính mình → 400.

---

## 📦 Postman Collection

Import JSON dưới đây vào Postman:

<details>
<summary>Click để mở collection v2.1</summary>

```json
{
  "info": {
    "name": "LearnLoom QA",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "BASE", "value": "http://localhost:5000" }
  ],
  "item": [
    { "name": "current_user",
      "request": { "method": "GET", "url": "{{BASE}}/auth/current_user" } },
    { "name": "courses list",
      "request": { "method": "GET", "url": "{{BASE}}/api/courses?page=1&limit=10" } },
    { "name": "my orders",
      "request": { "method": "GET", "url": "{{BASE}}/api/orders/mine" } },
    { "name": "review create",
      "request": {
        "method": "POST",
        "url": "{{BASE}}/api/reviews/{{courseId}}/{{userId}}",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\n  \"rating\": 5,\n  \"comment\": \"tốt\"\n}" }
      }
    },
    { "name": "quiz start",
      "request": { "method": "POST", "url": "{{BASE}}/api/courses/assignments/{{assignmentId}}/start" } },
    { "name": "chat stream",
      "request": {
        "method": "POST",
        "url": "{{BASE}}/api/chat/stream",
        "body": { "mode": "raw", "raw": "{\n  \"message\": \"hello\",\n  \"sessionKey\": \"qa-1\"\n}" }
      }
    },
    { "name": "apply instructor",
      "request": {
        "method": "POST",
        "url": "{{BASE}}/api/instructor-applications",
        "body": { "mode": "raw", "raw": "{\n  \"fullName\": \"Test\",\n  \"expertise\": \"Web\",\n  \"motivation\": \"Hai chục ký tự motivation here\"\n}" }
      }
    },
    { "name": "course submit review",
      "request": { "method": "PUT", "url": "{{BASE}}/api/courses/{{slug}}/publish" } }
  ]
}
```

</details>

---

## Tips khi test với Postman

1. Bật **"Automatically follow redirects"** OFF khi test VNPay return — để xem redirect URL thật.
2. Bật `Cookies` domain `localhost` → paste `connect.sid` sau khi login OAuth trên browser.
3. Với SSE chat, dùng `Collection Runner` hoặc `curl -N` (Postman không hiển thị realtime tốt).
4. Nếu FE restart trung sprint → cookie mới, phải login lại.
