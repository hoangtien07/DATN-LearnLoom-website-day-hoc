// routes/subjectRoutes.js
import express from "express";
import {
  getSubjects,
  createSubject,
  deleteSubject,
  updateSubject,
} from "../controllers/subjectController.js";

const router = express.Router();

// Định nghĩa các route
router.get("/", getSubjects);
router.post("/", createSubject);
router.delete("/:id", deleteSubject);
router.put("/:id", updateSubject); // Thêm route cho việc cập nhật môn học

export default router;
