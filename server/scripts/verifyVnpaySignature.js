// Verify VNPay TMN_CODE + HASH_SECRET pair độc lập với logic BE.
// Mục đích: khi BE vẫn trả "Sai chữ ký" (code 70) sau khi fix tất cả bug code,
// script này giúp xác định vấn đề là do **cặp TMN/Secret sai** hay do logic.
//
// Cách dùng:
//   cd server
//   node scripts/verifyVnpaySignature.js
//
// Output: 1 URL test → paste vào browser → nếu VNPay vẫn báo "Sai chữ ký" →
// 100% do TMN_CODE/HASH_SECRET trong .env không đúng cặp, hãy login lại sandbox
// VNPay và copy lại chính xác.
//
// Ghi chú: thẻ test sandbox NCB: 9704198526194129 · NGUYEN VAN A · 07/19 · OTP 123456

import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const tmnCode = (process.env.VNPAY_TMN_CODE || "").trim();
const hashSecret = (process.env.VNPAY_HASH_SECRET || "").trim();
const vnpUrl = (
  process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
).trim();

if (!tmnCode || !hashSecret) {
  console.error("❌ Thiếu VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET trong .env");
  process.exit(1);
}

console.log("=".repeat(60));
console.log("VNPay signature verification — standalone test");
console.log("=".repeat(60));
console.log(`TMN_CODE:       ${tmnCode} (độ dài ${tmnCode.length})`);
console.log(`HASH_SECRET:    ${"*".repeat(hashSecret.length)} (độ dài ${hashSecret.length})`);
console.log(`VNPAY_URL:      ${vnpUrl}`);
console.log();

// Giá trị cố định để test — giống sample code VNPay.
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const createDate =
  now.getFullYear() +
  pad(now.getMonth() + 1) +
  pad(now.getDate()) +
  pad(now.getHours()) +
  pad(now.getMinutes()) +
  pad(now.getSeconds());
const txnRef = `VERIFY${Date.now()}`;

const params = {
  vnp_Version: "2.1.0",
  vnp_Command: "pay",
  vnp_TmnCode: tmnCode,
  vnp_Locale: "vn",
  vnp_CurrCode: "VND",
  vnp_TxnRef: txnRef,
  vnp_OrderInfo: `Test verify ${txnRef}`,
  vnp_OrderType: "other",
  vnp_Amount: 1000000, // 10,000 VND × 100
  vnp_ReturnUrl: "http://localhost:5000/api/orders/payment/vnpay-return",
  vnp_IpAddr: "127.0.0.1",
  vnp_CreateDate: createDate,
};

// Sort theo alphabet + stringify theo đúng convention VNPay.
const encodeValue = (v) => encodeURIComponent(String(v)).replace(/%20/g, "+");
const sortedKeys = Object.keys(params).sort();
const signData = sortedKeys.map((k) => `${k}=${encodeValue(params[k])}`).join("&");
const signature = crypto
  .createHmac("sha512", hashSecret)
  .update(signData, "utf8")
  .digest("hex");

const fullUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signature}`;

console.log("SignData (được ký):");
console.log(signData);
console.log();
console.log(`Signature: ${signature}`);
console.log();
console.log("=".repeat(60));
console.log("👉 URL TEST — paste vào browser:");
console.log("=".repeat(60));
console.log(fullUrl);
console.log();
console.log("Giải thích kết quả:");
console.log("  • Nếu VNPay HIỆN trang thanh toán → TMN/Secret ĐÚNG, bug ở BE code.");
console.log("  • Nếu VNPay báo 'Sai chữ ký' (code 70) → SAI cặp TMN_CODE / HASH_SECRET.");
console.log("    Cách khắc phục: login lại https://sandbox.vnpayment.vn → Merchant");
console.log("    → chọn đúng merchant đã dùng → copy lại TMN + Secret vào .env.");
console.log("  • Nếu VNPay báo lỗi khác → đọc error code và tra ở:");
console.log("    https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/");
console.log();
