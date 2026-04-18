# 🎬 Demo Script — Bảo vệ DATN LearnLoom

> Kịch bản trình diễn ~**10 phút** cho hội đồng chấm điểm.
> Mục tiêu: chứng minh hệ thống **không chỉ CRUD** — có enforce business rule, access control, audit log.

---

## 1. Pre-flight checklist (làm ngày trước buổi demo)

### 1.1. Khởi tạo môi trường
```bash
# Terminal 1 — Backend
cd server
npm install
cp .env.example .env   # điền MONGO_URI, SESSION_SECRET, GOOGLE_*, GEMINI_*, VNPAY_*
node scripts/seedTestData.js --apply --purge
npm run start
# → kiểm tra log "Server running on port 5000"

# Terminal 2 — Frontend
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000
npm run dev
# → mở http://localhost:5173
```

### 1.2. Chuẩn bị 3 browser window
| Window | Role | Login Gmail |
|--------|------|-------------|
| Chrome | Admin | `admin.qa@...` hoặc gmail đã promote admin |
| Chrome Incognito 1 | Instructor | `instructor1.qa@...` hoặc gmail đã promote instructor |
| Chrome Incognito 2 | Student | `student1.qa@...` hoặc gmail thật |

> **Mẹo:** Nếu OAuth không kịp setup, mở trước mỗi window, login 1 lần → cookie session giữ trong tab suốt buổi demo.

### 1.3. Chuẩn bị thêm
- [ ] Terminal thứ 3 để **xem audit log realtime** (`cd server && npm run start | grep audit`)
- [ ] VNPay sandbox card: `9704198526194129 · NGUYEN VAN A · 07/19 · OTP 123456`
- [ ] MongoDB Compass (backup, để show record khi cần)
- [ ] Slide kết luận sẵn sàng
- [ ] Test đường truyền: OAuth Google, VNPay, Gemini đều hoạt động
- [ ] Đóng tất cả tab/app không cần thiết

### 1.4. Plan B nếu lỗi kỹ thuật
| Tình huống | Xử lý |
|-----------|-------|
| Mất mạng | Dùng `course/test-free-html` (không cần VNPay) + quiz preview đã seed |
| OAuth fail | Show code + file seedTestData.js để giải thích flow |
| VNPay lỗi sandbox | Highlight `test-free-html` flow enroll free thay thế |
| Gemini quota hết | Bỏ phần chat AI, đi thẳng sang instructor flow |
| Server crash | Restart nhanh (Ctrl+C → `npm run start`), trong lúc đợi nói về kiến trúc |

---

## 2. Timeline tổng quan (10 phút)

| Phút | Segment | Nhân vật | Điểm nhấn |
|------|---------|----------|-----------|
| 0:00 – 0:30 | **Mở đầu** | — | Giới thiệu dự án + 3 role |
| 0:30 – 3:30 | **Student journey** | student1 | Mua khóa · học · quiz chống gian lận · review có ràng buộc |
| 3:30 – 5:30 | **Instructor journey** | student3 → instructor2 | Đăng ký GV · tạo course · gửi duyệt |
| 5:30 – 7:30 | **Admin journey** | admin | Duyệt GV · duyệt course · xem audit |
| 7:30 – 8:30 | **Security highlight** | — | Access control · rate-limit · quota · audit |
| 8:30 – 9:30 | **Hạn chế & hướng phát triển** | — | 11 module roadmap |
| 9:30 – 10:00 | **Kết luận + Q&A mở** | — | — |

---

## 3. Kịch bản chi tiết

### 🎬 Mở đầu (0:00 – 0:30)

**Nói:**
> "Em xin trình bày LearnLoom — nền tảng học trực tuyến với 3 vai trò: **Học viên**, **Giảng viên**, **Quản trị viên**. Em sẽ demo 3 luồng user journey chính, mỗi luồng tập trung vào business rule em đã enforce để hệ thống không chỉ là một CRUD đơn thuần. Buổi demo khoảng 10 phút."

**Hiển thị:** Trang chủ `http://localhost:5173`

---

### 🎓 Student Journey (0:30 – 3:30)

**Nhân vật:** student1 (đã seed: enrolled test-js-basic @ 60%, đã có order success + pending)

#### Bước 1 — Duyệt catalog + filter (15s)

**Thao tác:**
- Click menu "Khám phá" → "Tất cả khóa học"
- Filter subject "Lập trình" + level "Cơ bản"
- Shows pagination

**Nói:**
> "Đây là trang duyệt khóa học có filter và phân trang — backend pagination để xử lý khi có hàng nghìn khóa học. Em không load all data lên rồi filter client-side."

#### Bước 2 — Vào course detail, show BR-01 access control (30s)

**Thao tác:**
- Click "QA · JavaScript cơ bản"
- Scroll xuống curriculum
- Show bài "Giới thiệu" có badge **Preview** (click vào được)
- Show bài "Biến và kiểu dữ liệu" có icon 🔒 **lock**

**Nói:**
> "Ở đây em đã enforce **Business Rule 01 — Access Control nội dung**. Bài có `isPreview: true` thì ai cũng xem được — kể cả guest chưa đăng nhập. Bài không preview thì khoá lại. Quan trọng hơn, backend **strip videoUrl, content, audioUrl** ra khỏi response cho user chưa enroll — không chỉ là ẩn ở UI. Em sẽ show bằng Postman."

**Optional** (nếu có thời gian): Mở Postman → `GET /api/courses/test-js-basic` không cookie → highlight `isLocked: true` và thiếu `videoUrl`.

#### Bước 3 — Mua khóa VNPay (45s)

**Thao tác:**
- (Nếu student1 đã enroll thì dùng student2 incognito window để mua `test-react-advanced`)
- Click "Đăng ký khóa học" → tạo order
- Chuyển đến VNPay sandbox
- Nhập thẻ NCB: `9704198526194129`, tên NGUYEN VAN A, 07/19, OTP `123456`
- Redirect về `/payment-redirect?status=success` → auto enroll

**Nói:**
> "Luồng thanh toán dùng VNPay Sandbox. Điều quan trọng: callback từ VNPay được **verify signature HMAC-SHA512** bên server trước khi enroll — attacker giả request sẽ bị reject. Nếu user đóng tab giữa chừng, order vẫn ở trạng thái `pending` và có thể **thanh toán lại từ trang lịch sử đơn hàng**."

**Show:** Mở `/profile/orders` → click "Thanh toán" cho order pending → VNPay mở lại với cùng transaction ref (idempotent).

#### Bước 4 — Làm quiz chống gian lận (60s) ⭐ (highlight chính)

**Thao tác:**
- Vào `test-js-basic` → mục lục → "Quiz 3 — timer 1 phút" (đã seed short timer)
- Click "Bắt đầu"
- **Show:** header hiển thị "Lần 1/3", timer đếm ngược (1:00 → 0:59 → ...)
- **Mở DevTools → Network → click request `/start`** → show response: `questions[]` CHỈ CÓ `text`, KHÔNG có `isCorrect`
- Chọn đáp án + submit trước khi hết giờ
- Show result page: **chưa** hiển thị correctAnswer (vì còn lượt retake)
- Click "Làm lại" → attempt 2/3
- Đợi quá 1 phút → auto-submit → **408 TIMER_EXPIRED** → chuyển về result
- (Hoặc submit đáp án cuối cùng) → hết lượt → result hiển thị **correctAnswer + explanation**

**Nói:**
> "Đây là **BR-12 và BR-14** — chống gian lận quiz. Có 3 tầng bảo vệ:
> 1. **Timer enforce ở server**, không phải client. Em show trong DevTools — request `/start` trả về câu hỏi đã **strip field isCorrect** khỏi options, attacker không thể inspect đáp án.
> 2. **Deadline tính từ startedAt server-side**. Nếu user chỉnh đồng hồ máy → server vẫn reject khi quá hạn.
> 3. **Đáp án đúng chỉ trả về khi user dùng hết lượt làm lại** — trước đó response không có field `correctAnswer`. User không học thuộc đáp án được."

**Show trong terminal backend:** log `audit:quiz.submit` xuất hiện mỗi lần submit.

#### Bước 5 — Review yêu cầu progress (30s)

**Thao tác:**
- Ở course detail, scroll đến phần Reviews
- **Với student1 (progress 60%)**: form review hiện ra, submit rating 5 → thành công
- **Chuyển sang student2 incognito (progress 20%)**: form **khóa** với thông báo "Cần hoàn thành tối thiểu 50%"
- **Thử submit 2 lần student1**: lần 2 trả 409, UI auto chuyển sang edit mode

**Nói:**
> "**BR-10**: học viên phải hoàn thành **ít nhất 50%** khóa học mới được đánh giá — chống fake review spam. **BR-11**: unique index `(userId, courseId)` ở database — 1 user chỉ có 1 review. Nếu submit lần 2 → 409, frontend tự chuyển sang chế độ cập nhật."

---

### 👨‍🏫 Instructor Journey (3:30 – 5:30)

**Nhân vật:** student3 (chưa enroll, chưa có đơn) + instructor2 (đã seed)

#### Bước 1 — Đăng ký làm giảng viên (45s)

**Thao tác:**
- Đăng nhập student3 → avatar dropdown → "Đăng ký làm giảng viên"
- Điền form: họ tên, chuyên môn, motivation ≥ 20 ký tự, URL chứng chỉ
- **Thử submit motivation < 20 ký tự** → validator chặn (client + server)
- Submit hợp lệ → badge "Đang chờ duyệt"
- Thử submit đơn thứ 2 → 409 "Đang có đơn chờ duyệt"

**Nói:**
> "**BR-03** — không phải ai cũng tự nâng lên làm giảng viên. Student nộp đơn với chuyên môn, motivation, chứng chỉ; admin phải duyệt mới chuyển role. Dữ liệu validation ở cả client và server, partial-unique index ngăn user spam đơn."

#### Bước 2 — Instructor workflow (75s)

**Thao tác (instructor2 window):**
- Vào `/instructor/dashboard`
- Show 4 course với các badge khác nhau:
  - `test-css-draft` — "Bản nháp" → nút "**Gửi duyệt**"
  - `test-html-pending` — badge "Chờ duyệt" → nút disabled
  - `test-ui-rejected` — badge "Bị từ chối" + **lý do từ chối hiển thị** → nút "Gửi duyệt lại"
  - `test-free-html` — "Đã xuất bản" (free)
- Click "Gửi duyệt" trên `test-css-draft` → badge chuyển "Chờ duyệt"
- Vào `/instructor/earnings` → show doanh thu + filter theo tháng

**Nói:**
> "**BR-20** — course moderation workflow. Instructor không publish trực tiếp; gửi duyệt → admin approve mới công khai. Course bị từ chối sẽ hiển thị **lý do cụ thể** để instructor sửa và gửi lại. Mỗi thao tác publish/reject/approve đều được **audit log**."

---

### 🛡️ Admin Journey (5:30 – 7:30)

**Nhân vật:** admin

#### Bước 1 — Admin dashboard (15s)

**Thao tác:**
- Login admin → tự động vào `/admin`
- Show 6 quick-link card: User mgmt, Course mgmt, Order mgmt, Subject mgmt, **Duyệt giảng viên**, **Duyệt khóa học**

#### Bước 2 — Duyệt giảng viên (45s)

**Thao tác:**
- Click "Duyệt giảng viên" → `/admin/instructor-applications`
- Show list có filter status (pending/approved/rejected/all)
- Show 1 đơn đang pending của student3 (vừa submit ở journey trước) + đơn cũ của student4 (seeded)
- Click "Duyệt" đơn của student3 → confirm
- **Show terminal backend:** dòng `audit:instructor_application.approve` với actorId admin, targetId đơn
- Switch sang student3 window → F5 → thấy role đã thành "instructor", dropdown có "Trang giảng viên"
- Quay lại admin → chọn filter "rejected" → show đơn student5 với reason đã ghi

**Nói:**
> "Mọi hành động admin đều được **ghi audit log** — actorId, action, targetId, timestamp, changes. Field nhạy cảm như password/secret tự động **redact** thành `[REDACTED]`. Đây là cơ sở cho compliance và debug sau này."

#### Bước 3 — Duyệt khóa học (60s)

**Thao tác:**
- Click "Duyệt khóa học" → `/admin/course-review`
- Show 2 course đang pending: `test-html-pending` (đã seed) + `test-css-draft` (vừa submit ở journey trước)
- Click "Xem trang khóa học" của `test-css-draft` → mở tab mới kiểm tra nội dung
- Đóng tab, click "Từ chối" → modal mở ra
- Nhập lý do < 5 ký tự → **400 validation error**
- Nhập lý do hợp lệ: "Nội dung chưa đủ chi tiết, thiếu bài tập thực hành" → xác nhận
- Switch sang instructor2 window → F5 dashboard → badge "Bị từ chối" + reason hiển thị
- Quay lại admin → duyệt `test-html-pending` → status chuyển approved, is_published=true
- Mở tab guest → `/course/test-html-pending` → **giờ đã public**

**Nói:**
> "Loop hoàn chỉnh: instructor submit → admin reject với reason → instructor sửa → resubmit → admin approve → course xuất bản. Không có bypass nào — cả instructor lẫn admin đều phải đi qua workflow."

---

### 🔐 Security Highlight (7:30 – 8:30)

**Nói + show nhanh:**

1. **Rate limit** (15s):
   - Mở DevTools Network → spam click chat AI 25 lần → thấy 429 với `Retry-After`.
   - "BR-17: guest có quota 5 tin/ngày per sessionKey — chống lạm dụng Gemini API."

2. **Field whitelist** (15s):
   - Postman: `PUT /api/users/:myId` body `{"role": "admin", "googleId": "fake"}` — student self-update
   - Response: `role` và `googleId` bị bỏ qua, DB không đổi.
   - "Self-update chỉ được sửa các field trong whitelist — ngăn privilege escalation."

3. **Audit log** (15s):
   - Mở terminal backend, filter `grep audit:`
   - Show các dòng JSON log: `{audit: true, action: "course.review_approve", actorId: "...", targetId: "...", changes: {...}}`

4. **Access control kép** (15s):
   - Guest → Postman `GET /api/courses/test-js-basic` → response có `videoUrl: undefined` cho lesson non-preview.
   - "Bảo mật ở nhiều tầng: route middleware, controller logic, database index — không chỉ ẩn ở UI."

---

### 📊 Hạn chế & hướng phát triển (8:30 – 9:30)

**Slide:** 11 module roadmap (dùng bảng từ report)

**Nói:**
> "Em muốn nêu rõ những gì **chưa làm** để hội đồng thấy em đã nhận thức được:
>
> **Nhóm nghiệp vụ cốt lõi** chưa có: Certificate PDF, Refund/khiếu nại, Cart mua nhiều khóa, File assignment (hiện chỉ quiz trắc nghiệm), Video upload nội bộ.
>
> **Nhóm UX & cộng đồng**: Drag-drop reorder, Notification email/in-app, Advanced quiz (shuffle, question bank).
>
> **Nhóm admin**: Analytics dashboard, Instructor KYC verification.
>
> **Mở rộng**: i18n đa ngôn ngữ, Social login Facebook/email-password.
>
> Tổng roadmap ước tính 11 tuần dev, đã ghi rõ trong báo cáo. Em chọn **làm chắc 9 business rule cốt lõi** thay vì làm rộng mà nông."

---

### 🎯 Kết luận (9:30 – 10:00)

**Nói:**
> "Tóm tắt: LearnLoom hiện đạt **~90% chuẩn LMS thương mại cơ bản**:
> - Enforce đầy đủ **9 business rule** từ phân tích BA (BR-01/03/05/10/11/12/14/17/20).
> - Defense-in-depth: middleware + controller + database index.
> - Audit log cho mọi thao tác admin/instructor.
> - Đã handover cho QA với ~124 test case và script seed data.
>
> Em xin nhận câu hỏi từ hội đồng."

---

## 4. Q&A Preparation

### 4.1. Câu hỏi kỹ thuật phổ biến

**Q: "Tại sao không dùng JWT mà dùng session?"**
> A: Với ứng dụng web có FE+BE cùng domain (hoặc subdomain), session cookie đơn giản, an toàn (HttpOnly, SameSite), không cần handle refresh token. JWT phù hợp khi có mobile app hoặc cross-domain. Em có thể migrate sang JWT khi mở rộng sang mobile ở roadmap.

**Q: "Tại sao chỉ Google OAuth, không có password?"**
> A: Scope DATN. Google OAuth đơn giản hóa quản lý password và email verification. Roadmap #11 có kế hoạch thêm email/password + social khác.

**Q: "Hệ thống chịu được bao nhiêu user đồng thời?"**
> A: Chưa load test formal. Với MongoDB Atlas M10 và Node.js đơn instance, ước tính ~500 concurrent user. Bottleneck dự kiến là Gemini API quota. Để scale cần: (1) connection pool tuning, (2) Redis session + rate-limit, (3) horizontal scaling Node.js, (4) CDN cho frontend.

**Q: "Rate limiter hiện tại in-memory — khi scale nhiều instance thì sao?"**
> A: Đúng, em đã note trong code comment — sẽ phải thay bằng Redis-backed limiter khi scale. Với 1 instance demo DATN vẫn đủ dùng.

**Q: "Nếu MongoDB down thì sao?"**
> A: Hệ thống sẽ fail toàn bộ API. Production cần MongoDB replica set. Ngoài ra middleware `chatQuotaForGuest` em thiết kế **fail-open** — nếu query quota lỗi, cho phép chat thay vì chặn oan user.

### 4.2. Câu hỏi nghiệp vụ

**Q: "Nếu instructor muốn hủy một khóa học đã có học viên?"**
> A: Hiện có logic chặn unpublish khi `totalStudentsEnrolled > 0` (code 409 `COURSE_HAS_ENROLLED_STUDENTS`). Instructor phải dùng "Ẩn" thay vì chuyển về nháp — học viên vẫn truy cập được nhưng không ai mua mới.

**Q: "Tại sao review yêu cầu 50% chứ không phải 100%?"**
> A: Ngưỡng này có thể config qua env `REVIEW_MIN_PROGRESS_PERCENT`. Em chọn 50% vì đây là mức user đã có trải nghiệm đủ — 100% quá khắt khe, đặc biệt khóa dài. Các LMS lớn (Udemy, Coursera) thường dùng mức này.

**Q: "Nếu user xóa cookie session thì quiz đã start có bị mất?"**
> A: Không. `startedAt` lưu ở database (AssignmentResult), không phải session. User login lại và vào quiz sẽ thấy tiếp tục với thời gian còn lại theo deadline đã tính từ lần start trước.

**Q: "Chat AI leak data giữa các user không?"**
> A: Không. `ChatMessage` filter theo `userId` (đã login) hoặc `sessionKey` (guest). User A không truy cập được history của user B. Context course được server fetch, không phải client gửi lên — tránh injection context giả.

### 4.3. Câu hỏi business

**Q: "Commission split giữa platform và instructor?"**
> A: Chưa implement. Đây là phần earnings analytics thuộc roadmap #9. Hiện tại instructor thấy tổng doanh thu, platform commission cần thêm config.

**Q: "Nếu user report nội dung không phù hợp?"**
> A: Chưa có flow report, thuộc roadmap admin. Hiện tại admin phải kiểm tra thủ công và dùng soft-delete.

**Q: "Làm sao biết khóa học nào là copy?"**
> A: Chưa có plagiarism detection. Thuộc roadmap instructor KYC + content moderation mở rộng.

### 4.4. Câu hỏi về scope

**Q: "Tại sao chọn scope này mà không rộng hơn?"**
> A: Em ưu tiên **chiều sâu business rule** (BR-01 đến BR-20) thay vì chiều rộng feature. Một hệ thống LMS có 50% feature nhưng lỏng rule sẽ dễ bị bypass hơn là 30% feature nhưng chặt chẽ. Em có roadmap 11 module rõ ràng để mở rộng sau.

**Q: "DATN khác với production sẵn sàng như thế nào?"**
> A: Production còn cần: load test, monitoring (Datadog/New Relic), CI/CD pipeline, automated test coverage ≥ 70%, security audit bởi bên thứ 3, DR plan, SLA. Em đã làm foundation: audit log, logger JSON, env separation. Phần còn lại là vấn đề infrastructure.

---

## 5. Demo do's and don'ts

### ✅ Do's
- **Nói về business rule** trước tính năng. Hội đồng quan tâm "em đã suy nghĩ gì?" hơn "em đã code gì?".
- **Mở DevTools / terminal** để show audit log, response shape — chứng minh implement thật.
- **Gõ lỗi có chủ đích** (motivation quá ngắn, rating = 6, submit khi chưa enroll) để show validation.
- **Sẵn sàng skip** một bước nếu đang trễ giờ — giữ timeline.

### ❌ Don'ts
- **Không** nói "em copy code từ...". Luôn giải thích tư duy.
- **Không** show code trực tiếp trừ khi được hỏi — hội đồng thích thấy nó chạy.
- **Không** dùng từ "chưa làm kịp" cho những thứ out-of-scope — dùng "thuộc roadmap" hoặc "out of scope DATN".
- **Không** cố sửa lỗi on-stage quá 30s — chuyển sang plan B.

---

## 6. Post-demo checklist

- [ ] Thu thập câu hỏi hội đồng → ghi vào `docs/qa/FEEDBACK.md`
- [ ] Commit bug tracking nếu phát hiện trong demo
- [ ] Email cảm ơn hội đồng (nếu phù hợp)

---

_Chúc bạn thành công! 🎓 — Lead Dev (Tiến)_
