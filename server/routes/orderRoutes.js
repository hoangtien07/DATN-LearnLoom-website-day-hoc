// server/routes/orderRoutes.js
import express from "express";
import {
  createOrder,
  updateOrder,
  getOrders,
  getOrdersByTeacher,
  createVnpayPaymentUrl,
  handleVnpayIpn,
  handleVnpayReturn,
  getOrderPaymentStatus,
} from "../controllers/orderController.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";

const router = express.Router();

router.post("/create", isAuthenticated, createOrder);
router.post(
  "/payment/create-vnpay-url",
  isAuthenticated,
  createVnpayPaymentUrl,
);
router.get("/payment/status/:orderId", isAuthenticated, getOrderPaymentStatus);
router.get("/payment/vnpay-ipn", handleVnpayIpn);
router.get("/payment/vnpay-return", handleVnpayReturn);
router.put("/:userId/:courseId/:transactionId", isAuthenticated, updateOrder);
// router.delete("/:orderId", deleteOrder);
router.get("/", getOrders);
// Lấy danh sách hóa đơn theo teacherId
router.get("/teacher/:teacherId", getOrdersByTeacher);

export default router;
