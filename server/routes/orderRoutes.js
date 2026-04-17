// server/routes/orderRoutes.js
import express from "express";
import {
  createOrder,
  updateOrder,
  getOrders,
  getMyOrders,
  getOrdersByTeacher,
  createVnpayPaymentUrl,
  handleVnpayIpn,
  handleVnpayReturn,
  getOrderPaymentStatus,
} from "../controllers/orderController.js";
import {
  isAuthenticated,
  checkRole,
  checkRoles,
} from "../middleware/isAuthenticated.js";
import { paymentLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/create", isAuthenticated, paymentLimiter, createOrder);
router.post(
  "/payment/create-vnpay-url",
  isAuthenticated,
  paymentLimiter,
  createVnpayPaymentUrl,
);
router.get("/payment/status/:orderId", isAuthenticated, getOrderPaymentStatus);
router.get("/payment/vnpay-ipn", handleVnpayIpn);
router.get("/payment/vnpay-return", handleVnpayReturn);

// Student xem đơn hàng của chính mình (LUỒNG 3).
router.get("/mine", isAuthenticated, getMyOrders);
router.put("/:userId/:courseId/:transactionId", isAuthenticated, updateOrder);

// Admin: xem toàn bộ đơn hàng.
router.get("/", isAuthenticated, checkRole("admin"), getOrders);
// Instructor/admin: xem đơn hàng của giảng viên.
router.get(
  "/teacher/:teacherId",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  getOrdersByTeacher,
);

export default router;
