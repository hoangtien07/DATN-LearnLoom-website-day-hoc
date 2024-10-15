// server/routes/orderRoutes.js
import express from "express";
import {
  createOrder,
  updateOrder,
  getOrders,
  getOrdersByTeacher,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/create", createOrder);
router.put("/:userId/:courseId/:transactionId", updateOrder);
// router.delete("/:orderId", deleteOrder);
router.get("/", getOrders);
// Lấy danh sách hóa đơn theo teacherId
router.get("/teacher/:teacherId", getOrdersByTeacher);

export default router;
