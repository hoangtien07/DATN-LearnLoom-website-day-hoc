# VNPay — Work dropped khi rollback về 9c7c7b7

> Baseline hiện tại: commit **9c7c7b7** `fix(vnpay): align với sample code VNPay + verify script` — đã test thành công trên máy khác với sandbox VNPay. Toàn bộ mã VNPay (`server/controllers/orderController.js`, `server/routes/orderRoutes.js`, `server/scripts/verifyVnpaySignature.js`, `frontend/src/lib/js/api.js` phần VNPay, `frontend/src/routes/payment-redirect/+page.svelte`) đã được restore về trạng thái tại commit này.
>
> File này note lại các công việc VNPay đã làm SAU 9c7c7b7 nhưng đang bị bỏ, để nếu cần tái phát triển sau này có thể tham khảo context và cherry-pick có chọn lọc.

---

## 1. Commit `11a9f3d` — `fix(payment): auto-poll trạng thái + retry khi VNPay callback chậm/lỡ`

**Ý tưởng**: trang `/payment-redirect` tự động poll `GET /api/orders/payment/status/:orderId` 2s/lần, tối đa 15 lần (~30s). Sau timeout hiện nút "Thử thanh toán lại" gọi lại `createVnpayPaymentUrl(orderId)`.

**Lý do khi đó**: phòng trường hợp IPN/return callback tới muộn, user ngồi chờ không thấy status update.

**Khi nào cần lại**:
- Nếu production deploy mà IPN VNPay thực sự có độ trễ (network/server) → user sẽ thấy pending lâu hơn mong muốn.
- Sandbox VNPay hiện xử lý sync trong return URL, nên không cần polling.

**Rủi ro tái áp dụng**: nếu callback silently fail (sai chữ ký / order-not-found), polling sẽ che lỗi dưới vỏ "đang chờ VNPay" → khó debug. Nếu thêm lại cần kèm server-side logging trên cả return và IPN handler.

---

## 2. Commit `779a569` — `fix(vnpay): luôn generate txnRef mới mỗi lần tạo payment URL`

**Ý tưởng**: mỗi lần `createVnpayPaymentUrl` được gọi đều sinh `vnp_TxnRef` mới, ghi đè `order.paymentGatewayTxnRef`.

**Triệu chứng ban đầu**: VNPay báo _"Giao dịch đang được xử lý hoặc đã quá thời gian thanh toán"_ khi user retry với cùng `vnp_TxnRef` của lần submit trước (VNPay nhớ txnRef như unique transaction attempt).

**Hậu quả không mong muốn (đã ghi nhận trong session debug)**: nếu callback VNPay tới với `vnp_TxnRef` CŨ (tab cũ, double-submit, IPN trễ sau retry) → `Order.findOne({ paymentGatewayTxnRef: txnRef })` trả `null` → DB không update → order kẹt `pending`.

**Trạng thái baseline (9c7c7b7)**: `txnRef = order.paymentGatewayTxnRef || <generated>` — **reuse** nếu đã có, chỉ sinh mới lần đầu. Vì user kia test sandbox thành công trên 9c7c7b7, **không cần đổi chiến lược này** trừ khi gặp đúng lỗi "đang được xử lý" từ VNPay.

**Nếu cần giải quyết cả 2 vấn đề cùng lúc**: cách làm trong session vừa rồi là nhúng `orderId` vào `vnp_TxnRef` (`${orderObjectId}T${timestamp}`) và parse ngược trong callback để tra order theo `_id` — ổn định kể cả khi `paymentGatewayTxnRef` bị overwrite. Format txnRef ~38 chars, vẫn nằm trong giới hạn VNPay.

---

## 3. Session debug (uncommitted, đã revert) — simplify redirect flow + fix callback lookup

Các thay đổi trong session không được commit nhưng có thể hữu ích nếu bug pending-stuck quay lại:

- **txnRef nhúng orderId**: `` `${order._id.toString()}T${Date.now()}` `` — callback parse regex `/^([a-f0-9]{24})T\d+$/i` → `Order.findById(parsedId)` (stable), fallback `findOne({ paymentGatewayTxnRef })` cho txnRef format cũ.
- **Bỏ ghi `transactionId` rỗng**: Order model có `unique + sparse` trên `transactionId`; set `""`/`"0"` cho nhiều order fail gây `E11000 duplicate key` khi save. Chỉ ghi khi `vnp_TransactionNo` non-empty và khác `"0"`.
- **Bỏ trang `/payment-redirect`**: BE `handleVnpayReturn` redirect thẳng `order.redirectUrl || /course/{slug}?payment=success|fail`. Course page (`frontend/src/routes/course/[slug]/+page.svelte`) `onMount` đọc query, `fetchUser()` refresh enrollment, `pushToast`, scrub URL bằng `history.replaceState`.
- **Thêm `logger.warn`** trên signature mismatch và order-not-found để log BE lộ ngay khi callback fail.

**Lý do không áp dụng**: user chốt rollback về luồng baseline đã được test thực tế thay vì kiến trúc mới chưa test.

---

## Snapshot: những gì KHÔNG bị touch trong rollback này

- Mọi cải tiến không phải VNPay giữa 9c7c7b7 → HEAD (curriculum drag-drop, quiz drag-drop, UX batches 1-8, XSS sanitize, toast hệ thống, loading/empty state, lazy image, mobile responsive, a11y, BR rules, …) **vẫn nguyên** trong course page, admin, profile, v.v.
- `server/models/Order.js` không đổi — vẫn giữ index `{ transactionId: 1 }` `unique + sparse` (cần lưu ý khi gặp bug E11000 trong tương lai).

## Commit chuỗi liên quan để tra cứu

```
779a569 fix(vnpay): luôn generate txnRef mới  ← dropped
11a9f3d fix(payment): auto-poll + retry       ← dropped
63e9330 Revert "fix(vnpay): sai chữ ký (70)"  ← đã là revert, no-op sau khi về 9c7c7b7
e67a6d2 Revert 9c7c7b7                         ← undo bởi rollback này
503ff98 Revert 19e4327 (MOCK mode)             ← no-op, MOCK mode cũng không cần
19e4327 feat(vnpay): MOCK mode                 ← không phù hợp sandbox thật
9c7c7b7 fix(vnpay): align sample + verify     ← ★ BASELINE ổn định hiện tại
d66b30a fix(vnpay): sai chữ ký (70)           ← đã bao gồm trong 9c7c7b7
```
