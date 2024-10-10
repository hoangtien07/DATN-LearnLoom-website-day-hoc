// server/routes/courseRoutes.js
import express from "express";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseById,
  getCourses,
  addChapter,
  getChaptersByCourseId,
  updateChapter,
  deleteChapter,
  createLesson,
  getLessonById,
  updateLesson,
  deleteLesson,
  createAssignment,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
} from "../controllers/courseController.js";

const router = express.Router();

// Course Routes
router.post("/", createCourse);
router.put("/:slug", updateCourse);
router.delete("/:slug", deleteCourse);
router.get("/:slug", getCourseBySlug);
router.get("/", getCourses);

// Chapter Routes
router.post("/:slug/sections", addChapter);
router.get("/:slug/sections", getChaptersByCourseId);
router.put("/:slug/sections/:sectionsIndex", updateChapter);
router.delete("/:slug/sections/:sectionsIndex", deleteChapter);

// Lesson Routes
router.post("/:slug/sections/:sectionsIndex/lessons", createLesson);
router.get("/:slug/sections/:sectionsIndex/lessons/:lessonId", getLessonById);
router.put("/:slug/sections/:sectionsIndex/lessons/:lessonId", updateLesson);
router.delete("/:slug/sections/:sectionsIndex/lessons/:lessonId", deleteLesson);

// Assignment Routes
router.post("/:slug/sections/:sectionsIndex/assignments", createAssignment);
router.get(
  "/:slug/sections/:sectionsIndex/assignments/:assignmentId",
  getAssignmentById
);
router.put(
  "/:slug/sections/:sectionsIndex/assignments/:assignmentId",
  updateAssignment
);
router.delete(
  "/:slug/sections/:sectionsIndex/assignments/:assignmentId",
  deleteAssignment
);

export default router;
