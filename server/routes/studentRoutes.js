import express from "express";
import { checkRole } from "../middleware/isAuthenticated.js";

const router = express.Router();

router.get("/", checkRole("student"), (req, res) => {
  res.send(req.user); // Trả về thông tin người dùng
});

export default router;
