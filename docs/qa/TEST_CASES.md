# 📝 Test Cases — LearnLoom (Full System)

> **~127 test case** cover toàn bộ hệ thống, không chỉ các BR mới.
> Format: **ID · Title · Preconditions · Steps · Expected · Priority · Type**

## Quy ước

- **Type:** FN Functional · SE Security · AU Authorization · DI Data Integrity · PE Performance · IG Integration · UI User Interface · RG Regression
- **Priority:** P1 (must pass) · P2 (should) · P3 (nice-to-have)
- **Accounts** (sau `seedTestData.js --apply`):
  - `admin.qa@learnloom.test` — Admin
  - `instructor.qa@learnloom.test` — Instructor
  - `student1.qa@learnloom.test` — enrolled `test-js-basic`, progress 60%
  - `student2.qa@learnloom.test` — chưa enroll
- **Courses:** `test-js-basic` (trả phí, approved+published), `test-css-draft` (nháp)

---

# M1 · Authentication

### TC-M1-01 · Login Google OAuth thành công — P1 · FN
Guest click "Đăng nhập" → Google consent → redirect về `/` với avatar hiển thị trong header.

### TC-M1-02 · Logout — P1 · FN
Click "Đăng xuất" → redirect về frontend, `/auth/current_user` trả `null`.

### TC-M1-03 · `/auth/current_user` cho guest — P1 · SE
Gọi không cookie → 200 với body `null` (không lộ stacktrace).

### TC-M1-04 · Session giữ sau reload — P1 · FN
Login → F5 → vẫn thấy avatar.

### TC-M1-05 · 2 cookie phiên cùng browser khác nhau → 2 user độc lập — P2 · SE
Dùng Incognito + normal, login 2 account, không conflict.

---

# M2 · Course catalog

### TC-M2-01 · Load `/course` hiển thị list có pagination — P1 · FN
Response 200, hiển thị ≥ 1 card, pagination component có.

### TC-M2-02 · Filter theo subject — P1 · FN
Chọn subject "Lập trình" → list chỉ còn course có subject khớp.

### TC-M2-03 · Filter theo level — P1 · FN
Chọn "Cơ bản" → filter đúng.

### TC-M2-04 · Filter theo price — P1 · FN
Chọn "Miễn phí" → chỉ course `price === 0`.

### TC-M2-05 · Filter theo duration range (ví dụ 5-10) — P1 · FN
Chỉ course có totalDuration trong khoảng.

### TC-M2-06 · Filter combo (multi-subject + price) — P2 · FN
`?subjects=A,B&prices=Miễn phí` → lọc giao.

### TC-M2-07 · Search keyword — P2 · FN
Gõ tìm "javascript" → list được filter (dùng header search bar).

### TC-M2-08 · Course đang draft/unpublished không hiển thị — P3 · SE
`test-css-draft` không xuất hiện trên catalog public.

---

# M3 · Course detail page

### TC-M3-01 · Guest vào `/course/test-js-basic` — P1 · FN
Thấy tên, giá, instructor, summary, curriculum. Lesson preview click được, non-preview có 🔒.

### TC-M3-02 · Student đã enroll → CTA "Tiếp tục học" — P1 · FN
Student1 vào → nút "Tiếp tục học" hoạt động, chuyển đến lesson chưa hoàn thành kế tiếp.

### TC-M3-03 · Recommend courses hiển thị — P2 · FN
Phần "Dành cho bạn" hoặc "Featured" có ≥ 1 card.

### TC-M3-04 · Add/Remove favorite — P1 · FN
Click ♥ → chuyển "Đã lưu yêu thích". Click lại → bỏ. Reload vẫn đúng trạng thái.

### TC-M3-05 · URL course không tồn tại → 404 UI — P2 · FN
`/course/khong-ton-tai-xxx` → hiển thị "Không tìm thấy" thay vì white screen.

---

# M4 · Enrollment

### TC-M4-01 · Enroll course free (price=0) — P1 · FN
Login student → bấm "Đăng ký" → API enroll → success, chuyển sang state "Đã enroll".

### TC-M4-02 · Enroll course trả phí → tạo order → redirect VNPay — P1 · IG
student2 chưa enroll → bấm "Đăng ký 199.000 VND" → redirect `sandbox.vnpayment.vn`.

### TC-M4-03 · VNPay thanh toán thành công → auto enroll — P1 · IG
Dùng thẻ NCB sandbox → VNPay return → `/payment-redirect?status=success` → back to course → student thấy "Tiếp tục học".

### TC-M4-04 · VNPay fail (cancel) → order fail, không enroll — P1 · IG
Trên trang VNPay click "Huỷ" → `/payment-redirect?status=fail` → không được học.

### TC-M4-05 · Gọi lại `create-vnpay-url` cho order pending → reuse txnRef — P1 · DI
Xem `Order.paymentGatewayTxnRef` không đổi sau 2 lần call.

### TC-M4-06 · Enroll trùng → 400 Already enrolled — P1 · DI
Student1 đã enroll, gọi lại API enroll → 400.

### TC-M4-07 · Guest không enroll được — P1 · SE
`POST /api/orders/create` không cookie → 401.

---

# M5 · Learning

### TC-M5-01 · Video lesson (YouTube) render — P1 · FN
Enrolled student vào lesson video → iframe YouTube hiển thị, play được.

### TC-M5-02 · Text lesson render HTML an toàn — P1 · SE
Nội dung text có `<script>` → bị strip hoặc không execute. Xem DevTools console.

### TC-M5-03 · Audio lesson có audio player — P2 · FN
Audio tag với controls.

### TC-M5-04 · Live lesson có link vào phòng học — P2 · FN
Hiển thị link/ngày, click mở tab mới.

### TC-M5-05 · Progress tăng khi hoàn thành item — P1 · FN
Student1 hoàn thành 1 lesson mới → `enrollment.progress` tăng (check qua `GET /api/courses/enrolled/:userId`).

### TC-M5-06 · Lesson không visible bị ẩn khỏi curriculum — P2 · FN
Instructor set `lesson.visible = false` → student không thấy trong sidebar.

### TC-M5-07 · Layout `/learn` responsive trên tablet — P2 · UI
Viewport 768px → sidebar + content cân đối, không cắt chữ.

### TC-M5-08 · Next/Previous lesson navigation — P3 · FN
(Nếu có nút next/prev trong `/learn` layout) hoạt động đúng thứ tự.

---

# M6 · Quiz / Assignment (BR-12 + BR-14)

### TC-12-01 · Start quiz lần đầu — P1 · FN
`POST /api/courses/assignments/:id/start` → 200 body có `startedAt, deadline, questions` (options không có `isCorrect`).

### TC-12-02 · Submit trong thời gian — P1 · FN
Submit < timer → 200, điểm đúng.

### TC-12-03 · Submit sau hết giờ → 408 TIMER_EXPIRED — P1 · SE
Chỉnh `timer=1` trong seed → đợi > 1 phút → submit → 408; bài lưu `isFinal: true`.

### TC-12-04 · Submit mà chưa start → 400 NOT_STARTED — P1 · SE
Bỏ qua start, submit ngay → 400.

### TC-12-05 · Hết maxAttempts → 409 MAX_ATTEMPTS_REACHED — P1 · FN
Submit 2 lần (maxAttempts=2) → start lần 3 bị 409.

### TC-12-06 · allowRetake=false → chỉ 1 attempt — P1 · FN
Seed course khác với `allowRetake: false` → start lần 2 → 409 `RETAKE_NOT_ALLOWED`.

### TC-14-01 · Response submit chưa final → không có correctAnswer — P1 · SE
allowRetake=true, attempt 1/2: response `isFinal: false`, `answers[].correctAnswer` undefined.

### TC-14-02 · Attempt cuối → response có correctAnswer + explanation — P1 · FN
Attempt 2/2: `isFinal: true`, full detail.

### TC-14-03 · GET `student-results` trước final → không correctAnswer — P1 · SE
Xem kết quả giữa chừng → trả `isFinal: false`, không lộ đáp án.

---

# M7 · Reviews (BR-10 + BR-11)

### TC-10-01 · Progress < 50% → 403 PROGRESS_INSUFFICIENT — P1 · FN
Seed user progress=10 → submit review → 403, body có `currentProgress: 10, minProgress: 50`.

### TC-10-02 · Progress ≥ 50% → gửi được — P1 · FN
student1 (60%) → 201, avgRating course cập nhật.

### TC-10-03 · Rating ngoài 1-5 → 400 — P1 · FN
rating=6 → validator chặn.

### TC-10-04 · Comment rỗng → 400 — P1 · FN
`""` → "bắt buộc".

### TC-10-05 · Chưa enroll → 403 NOT_ENROLLED — P1 · SE
student2 → 403.

### TC-11-01 · Submit lần 2 → 409 REVIEW_ALREADY_EXISTS — P1 · DI
Body có `existingReviewId`. FE auto chuyển sang edit.

### TC-11-02 · Update review hiện có — P1 · FN
PUT với reviewId → 200, avgRating cập nhật.

### TC-11-03 · Race condition → 1 success + 1 409 — P2 · DI
2 request song song → không 500.

---

# M8 · Chat AI (BR-17)

### TC-M8-01 · Student logged-in chat có context lesson — P1 · IG
POST /api/chat/stream với courseSlug + lessonId → SSE streaming, response có context lesson hiện tại.

### TC-M8-02 · History được lưu — P1 · FN
GET /api/chat/history → trả messages theo thứ tự.

### TC-M8-03 · Clear history — P2 · FN
DELETE /api/chat/history → empty.

### TC-M8-04 · Delete 1 message — P2 · FN
DELETE /api/chat/messages/:id → chỉ xoá đúng message đó.

### TC-M8-05 · Chat spam 25 request/phút → 429 từ `chatLimiter` — P1 · PE
Vượt 20 req/phút → 429 với `Retry-After`.

### TC-17-01 · Guest gửi 5 tin (default quota) — P1 · PE
Cùng sessionKey, message khác nhau → 5 success.

### TC-17-02 · Tin thứ 6 → 429 GUEST_QUOTA_EXCEEDED — P1 · PE
Response `code: "GUEST_QUOTA_EXCEEDED"`, quota/used hiển thị.

### TC-17-03 · User login không dính quota guest — P1 · FN
Login → gửi 10 tin → tất cả ok.

---

# M9 · Student profile

### TC-M9-01 · /profile hiển thị thông tin — P1 · FN
Avatar, username, email.

### TC-M9-02 · Update profile (username, bio) — P1 · FN
PUT /api/users/:id body `{username: "Mới"}` → 200. Field ngoài whitelist bị bỏ.

### TC-M9-03 · Gửi `role` khi self-update → bỏ qua — P1 · SE
Student self-update có `role: "admin"` → DB vẫn role student.

### TC-M9-04 · Learning path hiển thị khóa đã enroll — P1 · FN
Student1 → thấy `test-js-basic` với progress 60%.

### TC-M9-05 · Favorites page — P2 · FN
Add favorite → hiển thị ở `/profile` tab favorites.

### TC-05-01 · `/profile/orders` list đơn — P1 · FN
Student1 thấy ≥ 2 order (1 success, 1 pending).

### TC-05-02 · Filter status — P2 · FN
Filter "Đã thanh toán" → chỉ status=success.

### TC-05-03 · Retry payment pending → VNPay flow — P1 · IG
Click → redirect VNPay → thanh toán → về `/payment-redirect?status=success`.

### TC-05-04 · Student khác không thấy đơn lẫn nhau — P1 · SE
student2 → không thấy order của student1.

### TC-05-05 · Guest → 401 — P1 · SE
Không cookie → 401.

---

# M10 · Instructor workflow

### TC-M10-01 · Dashboard hiển thị courses của mình — P1 · FN
`fetchCourseByInstructor` → list đúng, có tab "All / Published / Draft / Hidden".

### TC-M10-02 · Tạo course draft — P1 · FN
Modal "Tạo mới" → submit → 201, redirect đến edit.

### TC-M10-03 · Trùng slug → 409 COURSE_SLUG_TAKEN — P1 · DI
Tạo lần 2 cùng slug → error rõ.

### TC-M10-04 · Edit course → cập nhật info — P1 · FN
PUT /api/courses/:slug → 200.

### TC-M10-05 · Thêm section → course.sections push — P1 · FN
POST sections.

### TC-M10-06 · Thêm lesson/assignment vào section — P1 · FN
POST items.

### TC-M10-07 · Ẩn / hiện khóa — P2 · FN
hide → visible=false, unhide → visible=true.

### TC-M10-08 · Xem earnings — P1 · FN
`/instructor/earnings` → list order của mình, amount hiển thị đúng.

### TC-M10-09 · Xem enrolled students — P2 · FN
`/instructor/gradebook` → list student + progress.

### TC-03-01 · Student nộp đơn làm GV — P1 · FN
student2 submit → 201.

### TC-03-02 · Motivation < 20 ký tự → 400 — P1 · FN

### TC-03-03 · Đã có đơn pending → 409 — P1 · DI

### TC-03-04 · Đã là instructor/admin → 400 ALREADY_PRIVILEGED — P1 · AU

### TC-20-01 · Instructor publish course draft → reviewStatus=pending — P1 · FN
Click "Gửi duyệt" → BE response reviewStatus=pending, badge FE chuyển "Chờ duyệt".

### TC-20-05 · Instructor resubmit sau reject — P1 · FN

---

# M11 · Admin workflow

### TC-M11-01 · Admin dashboard hiển thị 5 quick-link — P1 · FN
users, courses, subjects, orders, instructor-applications, course-review.

### TC-M11-02 · User management list — P1 · FN
Admin vào `/admin/user-management` → list có pagination.

### TC-M11-03 · Admin promote user → instructor — P1 · AU
PUT /api/users/:id body `{role: "instructor"}` → 200.

### TC-M11-04 · Admin tự đổi role của mình → 400 — P1 · SE
Protect admin lockout.

### TC-M11-05 · Admin delete user khác → 200 + audit log — P1 · AU

### TC-M11-06 · Admin không thể self-delete → 400 — P1 · SE

### TC-M11-07 · Course management list — P1 · FN
`/admin/course-management` → list all.

### TC-M11-08 · Admin soft-delete course → is_deleted=true — P1 · FN

### TC-M11-09 · Admin restore deleted course — P2 · FN

### TC-M11-10 · Order management list — P2 · FN
`/admin/order-management` → list all orders, admin-only.

### TC-M11-11 · Non-admin truy cập /api/orders → 403 — P1 · SE

### TC-M11-12 · Subject management CRUD — P2 · FN

### TC-03-05 · Admin approve instructor application → role thay đổi — P1 · AU

### TC-03-06 · Admin reject với reason ≥ 5 ký tự — P1 · FN

### TC-03-07 · Audit log ghi lại action — P2 · DI

### TC-20-02 · Admin thấy course pending list — P1 · FN

### TC-20-03 · Admin approve course → publish — P1 · FN

### TC-20-04 · Admin reject course với reason — P1 · FN

### TC-20-06 · Approved course trước → instructor publish ngay — P1 · FN

### TC-20-07 · Admin override publish course chưa duyệt — P1 · AU

### TC-20-08 · Student không thấy course draft/pending ở /course — P1 · SE

---

# M12 · Comments

### TC-M12-01 · Student comment trên lesson — P1 · FN

### TC-M12-02 · Reply comment — P2 · FN

### TC-M12-03 · Delete comment của mình — P2 · FN

---

# M13 · Access control (BR-01)

### TC-01-01 · Guest không thấy videoUrl lesson non-preview — P1 · SE
GET /api/courses/test-js-basic → itemId[] có `isLocked: true`, không có `videoUrl`/`content`.

### TC-01-02 · Guest xem được preview lesson — P1 · FN
Lesson `isPreview: true` giữ full.

### TC-01-03 · Guest GET items/:type/:id → 401 — P1 · SE

### TC-01-04 · student2 chưa enroll → 403 NOT_ENROLLED — P1 · SE
FE hiển thị CTA "Đăng ký khóa học".

### TC-01-05 · student1 enrolled → 200 full content — P1 · FN

### TC-01-06 · Instructor owner → 200 full content — P1 · AU

### TC-01-07 · Admin → 200 full content với mọi course — P1 · AU

### TC-01-08 · UI lock icon + Preview badge — P2 · UI

---

# M14 · VNPay integration

### TC-M14-01 · Create VNPay URL trả `paymentUrl` đúng format — P1 · IG
URL có hash + tmnCode.

### TC-M14-02 · Return URL với signature hợp lệ → cập nhật order — P1 · IG

### TC-M14-03 · Return URL với signature **giả** → 97 Invalid secure hash — P1 · SE
Manually sửa 1 ký tự trong signature → không được enroll.

### TC-M14-04 · Amount mismatch → 04 Invalid amount — P1 · SE
Sửa `vnp_Amount` trong URL.

### TC-M14-05 · IPN webhook cùng txnRef 2 lần → idempotent — P1 · DI
Gọi return URL 2 lần → order vẫn success, không double enroll.

### TC-M14-06 · Missing VNPAY_HASH_SECRET env → 500 có log rõ — P1 · RG
Bỏ env → gọi create URL → error rõ.

---

# M15 · Security baseline (P0/P1)

### TC-M15-01 · Rate-limit auth → 429 sau nhiều login attempt — P1 · PE
30+ req/15 phút đến `/auth/google` → 429.

### TC-M15-02 · Rate-limit payment 10 req/phút — P1 · PE

### TC-M15-03 · Rate-limit write (review, comment) 60 req/phút — P2 · PE

### TC-M15-04 · Field whitelist user update — P1 · SE
PUT user kèm `googleId: "malicious"` → BE bỏ, DB không thay đổi.

### TC-M15-05 · SESSION_SECRET thiếu → server refuse start — P1 · SE
Chạy `npm start` khi .env không có SESSION_SECRET → exit 1 với log rõ.

### TC-M15-06 · Audit log ghi cho admin action — P2 · DI
Xem stdout server có `audit:` line với actorId đúng.

### TC-M15-07 · Redact password/secret trong audit — P1 · SE
Audit body có key `password` → giá trị `[REDACTED]`.

### TC-M15-08 · CORS block origin ngoài whitelist — P1 · SE
Request với `Origin: http://evil.com` → 403.

---

# M16 · Responsive UI

### TC-M16-01 · Mobile 375px: header, catalog, course detail — P1 · UI

### TC-M16-02 · Tablet 768px: learn page — P2 · UI

### TC-M16-03 · Desktop 1920px: admin dashboard — P2 · UI

### TC-M16-04 · Orders page card layout chuyển 1 cột dưới 680px — P2 · UI
Check breakpoint đã có trong CSS.

---

# M17 · Cross-browser

### TC-M17-01 · Chrome latest — full regression — P1 · RG

### TC-M17-02 · Firefox latest — core flows (login, buy, learn, quiz) — P1 · RG

### TC-M17-03 · Edge latest — core flows — P2 · RG

---

# M18 · Data migration

### MG-01 · Dry-run `migrateReviewStatus.js` — P1 · DI
In số course sẽ update, không ghi DB.

### MG-02 · `--apply` → course đã published set `reviewStatus: "approved"` — P1 · DI
Kiểm với MongoDB Compass.

### MG-03 · Sau migrate, instructor publish course cũ không bị về pending — P1 · FN
Vì reviewStatus đã approved → publish thẳng.

---

# Smoke tests (chạy sau mọi hotfix)

| SM-ID | Scenario | Thời gian ước tính |
|-------|----------|--------------------|
| SM-01 | OAuth login, /auth/current_user | 1' |
| SM-02 | /course catalog + pagination | 1' |
| SM-03 | student1 /profile/orders | 1' |
| SM-04 | VNPay full flow (buy → return → enroll) | 5' |
| SM-05 | Chat AI stream 1 message | 2' |
| SM-06 | Instructor tạo course + gửi duyệt | 3' |
| SM-07 | Admin duyệt course | 2' |
| SM-08 | Student quiz full flow (start → submit → results) | 3' |

**Tổng smoke ~ 18 phút.** Chạy trước mỗi release.

---

# Test execution checklist

- [ ] Setup environment (mục 4 trong README)
- [ ] Seed test data (`seedTestData.js --apply`)
- [ ] Chạy test case P1 theo thứ tự module M1 → M18
- [ ] Log bug theo template `BUG_REPORT_TEMPLATE.md`
- [ ] Tổng kết trạng thái Pass/Fail/Blocked
- [ ] Chạy smoke suite sau mỗi hotfix
- [ ] Ký exit criteria (mục 8 trong README)

---

_Tổng: ~127 test case. Ước tính effort: **5–7 ngày** cho 1 tester full-time · **3–4 ngày** cho 2 tester._
