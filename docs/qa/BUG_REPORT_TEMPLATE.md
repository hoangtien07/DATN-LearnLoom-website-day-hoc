# 🐞 Bug Report Template — LearnLoom

> Copy template dưới đây khi tạo ticket (Jira / GitHub Issues / whatever). Nếu trên Jira có sẵn "Bug issue type" với custom fields, ưu tiên dùng field tương ứng.

---

## Template

```markdown
### [BUG-XXX] <Tóm tắt 1 dòng>

**Severity:** Critical / High / Medium / Low
**Priority:** P1 / P2 / P3
**Module:** M1..M18 hoặc BR-0x
**Test Case liên quan:** TC-...
**Commit test trên:** `<git sha>` (chạy `git log --oneline -1`)
**Environment:** local · dev · staging · production
**Build:**
  - Frontend: port 5173 · branch/commit: ...
  - Backend: port 5000 · branch/commit: ...
  - Database: MongoDB local / Atlas URI (che password)
  - OS / Browser: Chrome 120 / macOS 14.2

---

### Preconditions (trạng thái trước khi tái hiện)
- User: `student1.qa@learnloom.test` (role: student, enrolled test-js-basic progress 60%)
- Data: seed mặc định sau `seedTestData.js --apply`
- Điều kiện khác: ...

---

### Steps to reproduce
1. ...
2. ...
3. ...

### Expected
Mô tả hành vi đúng (tham chiếu BR / AC / Test Case).

### Actual
Mô tả hành vi sai. Kèm ảnh chụp / log / HTTP response.

---

### Evidence
- Screenshot: `bug-xxx-1.png`
- Video (nếu có): link Loom / MP4
- Backend log (xài `LOG_LEVEL=debug` khi tái hiện):
  ```
  {"time":"...","level":"error","msg":"..."}
  ```
- HTTP request/response:
  ```http
  POST /api/courses/assignments/abc/submit
  Cookie: connect.sid=...
  Content-Type: application/json

  {...}

  ---

  HTTP/1.1 500 Internal Server Error
  {"message": "..."}
  ```

---

### Impact
- Ai bị ảnh hưởng (role, %user)?
- Chặn luồng / có workaround không?
- Dữ liệu bị ảnh hưởng không?

### Workaround tạm (nếu có)
...

### Suspected root cause (QA đoán — optional)
File `server/controllers/...` line ... có vẻ thiếu check X.

### Assigned to
@dev-owner (thường là Tiến)
```

---

## Hướng dẫn phân loại Severity

| Severity | Khi nào chọn |
|----------|-------------|
| **Critical** | - Chặn **luồng chính** (login, buy, learn)<br>- **Lộ secret / content trả phí** cho guest<br>- **Data loss** (xoá nhầm, không rollback được)<br>- **Sai business rule cốt lõi** (enroll bypass, quiz không enforce timer) |
| **High** | - Chặn luồng **phụ** (retake quiz, review)<br>- **Sai logic** quan trọng (sai progress, sai avgRating)<br>- Trả sai **HTTP status code** gây FE xử lý sai<br>- Crash server / frontend blank page (không phải luồng chính) |
| **Medium** | - Sai UI/UX nhưng có **workaround**<br>- **Validation missing** ở edge case hiếm<br>- Message lỗi **không rõ ràng**<br>- Performance chậm (3-5s) nhưng không crash |
| **Low** | - Typo, **cosmetic** (color, spacing, alignment)<br>- Inconsistency nhỏ giữa các trang<br>- **Console warning** không ảnh hưởng UX |

---

## Hướng dẫn chọn Priority

Không giống Severity (tác động), Priority là **thứ tự fix**:
- **P1** — fix ngay trong sprint hiện tại, chặn release nếu còn.
- **P2** — fix trong 1-2 sprint tới.
- **P3** — nice-to-have, backlog.

*Nguyên tắc:* Critical thường = P1, High thường = P1 hoặc P2, Medium = P2, Low = P3.

Ngoại lệ:
- Low severity + liên quan **audit / branding quan trọng** → có thể P1.
- High severity **ở module out-of-scope** (ví dụ LUỒNG thiếu) → không log, hoặc P3 roadmap.

---

## Definition of Done (cho bug đã fix)

Bug chỉ được **close** khi:
- [ ] Dev đã merge hotfix vào branch test.
- [ ] QA đã **verify** trên environment test và confirm Pass.
- [ ] Không có **regression** ở module liên quan (chạy smoke suite SM-01 → SM-08).
- [ ] Bug **Critical / High** phải có **test case tự động** hoặc **manual regression test** được thêm vào `TEST_CASES.md` (tránh lặp lại).
- [ ] Nếu bug liên quan **security / data** → phải có dev lead (Tiến) + LM (Hùng) approve fix.

---

## Example (bug mẫu)

### [BUG-042] Guest có thể xem videoUrl của lesson trả phí qua GET /api/courses/:slug

**Severity:** Critical
**Priority:** P1
**Module:** M13 (BR-01)
**Test Case:** TC-01-01
**Commit:** `4ce1da2`
**Environment:** local
**Build:** FE main@4ce1da2 · BE main@4ce1da2 · MongoDB local

### Preconditions
- Chưa login (guest).
- Course `test-js-basic` có lesson thứ 2 (VideoLesson) với `isPreview: false`, `videoUrl: "https://youtube.com/..."`.

### Steps
1. Mở Postman, tạo request `GET http://localhost:5000/api/courses/test-js-basic` (không cookie).
2. Xem response body.

### Expected
Response `sections[0].items[1].itemId` phải có `isLocked: true` và **KHÔNG có** field `videoUrl`.

### Actual
Response vẫn trả về `videoUrl: "https://youtube.com/xxx"` — content trả phí bị leak.

### Evidence
```json
{
  "_id": "lesson_2",
  "name": "Biến & kiểu dữ liệu",
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "isLocked": true
}
```

### Impact
- Mọi guest đều xem được content trả phí → mất doanh thu.
- Vi phạm BR-01 (Critical severity).

### Suspected root cause
`utils/courseAccess.js` `sanitizeLesson()` có thể không được gọi cho nhánh nào đó. Kiểm tra path populate.

### Assigned to
@Tien

---

*Cuối template. Khi có câu hỏi về severity / priority phân loại, hỏi QA Lead (Trang) hoặc LM (Hùng).*
