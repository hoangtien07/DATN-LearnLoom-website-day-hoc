import express from "express";
import { checkRole } from "../middleware/isAuthenticated.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/", checkRole("teacher"), (req, res) => {
  res.send(req.user); // Trả về thông tin người dùng
});

router.get("/teachers", async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
