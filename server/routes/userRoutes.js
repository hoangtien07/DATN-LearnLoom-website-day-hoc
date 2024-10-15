import express from "express";
import {
  getUsers,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
// import { checkRole } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Chỉ admin mới có thể truy cập các route này
// router.use(checkRole("admin"));

router.get("/", getUsers);
router.put("/:userId", updateUser);
router.delete("/:userId", deleteUser);

export default router;
