// routes/subjectRoutes.js
import express from "express";
import {
  getSubjects,
  createSubject,
  deleteSubject,
  updateSubject,
} from "../controllers/subjectController.js";
import { isAuthenticated, checkRole } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Định nghĩa các route
router.get("/", getSubjects);
router.post("/", isAuthenticated, checkRole("admin"), createSubject);
router.delete("/:id", isAuthenticated, checkRole("admin"), deleteSubject);
router.put("/:id", isAuthenticated, checkRole("admin"), updateSubject);

export default router;
