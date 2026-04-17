import express from "express";
import {
  getUsers,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import {
  isAuthenticated,
  checkRole,
} from "../middleware/isAuthenticated.js";

const router = express.Router();

// Chỉ admin xem danh sách & xóa user.
router.get("/", isAuthenticated, checkRole("admin"), getUsers);
router.delete("/:userId", isAuthenticated, checkRole("admin"), deleteUser);

// Update: admin hoặc chính chủ (kiểm tra trong controller).
router.put("/:userId", isAuthenticated, updateUser);

export default router;
