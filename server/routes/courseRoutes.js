// server/routes/courseRoutes.js
import express from "express";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseBySlug,
  getCourseByInstructor,
  getCourses,
  addSection,
  getSectionsByCourseSlug,
  updateSection,
  deleteSection,
  reorderSections,
  reorderItemsInSection,
  addItemToSection,
  getItem,
  updateItem,
  deleteItem,
  enrollCourse,
  updateCourseProgress,
  getAllResultOfAssignment,
  getUserAssignmentStatus,
  submitQuiz,
  getStudentAssignmentResults,
  getEnrolledCourses,
  getFavoriteCourses,
  getRecommendedCourses,
  addCourseToFavorites,
  removeCourseFromFavorites,
  getEnrolledStudents,
  softDeleteCourse,
  hideCourse,
  unhideCourse,
  publishCourse,
  unpublishCourse,
  getHiddenCoursesByInstructor,
  getDeletedCoursesAdmin,
  restoreDeletedCourse,
  toggleLessonVisibility,
} from "../controllers/courseController.js";
import {
  isAuthenticated,
  checkRole,
  checkRoles,
} from "../middleware/isAuthenticated.js";

const router = express.Router();

// --- GET Routes ---

// Lấy bài học/ bài kiểm tra
router.get("/items/:itemType/:itemId", getItem);
// Lấy mục lục
router.get("/:slug/sections", getSectionsByCourseSlug);
// Lấy khóa học
router.get("/:slug", getCourseBySlug);
// Lấy các khóa học đã tạo của giáo viên
router.get("/instructor/:instructorId", getCourseByInstructor);
// Lấy các khóa học đã ẩn của giảng viên
router.get(
  "/instructor/:instructorId/hidden",
  isAuthenticated,
  getHiddenCoursesByInstructor,
);
// Admin: lấy danh sách khóa học bị xóa mềm
router.get(
  "/admin/deleted",
  isAuthenticated,
  checkRole("admin"),
  getDeletedCoursesAdmin,
);
// Lấy trạng thái bài kiểm tra của học sinh
router.get(
  "/assignments/:assignmentId/user/:userId/status",
  getUserAssignmentStatus,
);
// Lấy kết quả bài kiểm tra
router.get(
  "/assignments/:assignmentId/user/:userId/student-results",
  getStudentAssignmentResults,
);
// Lấy toàn bộ kết quả của 1 bài kiểm tra
router.get("/assignments/:assignmentId/results", getAllResultOfAssignment);
// Lấy danh sách khóa học đã đăng ký
router.get("/enrolled/:userId", getEnrolledCourses);

router.get("/enrolled-students/:courseId", getEnrolledStudents);
// Lấy danh sách khóa học yêu thích
router.get("/favorites/:userId", getFavoriteCourses);
// Lấy danh sách khóa học đề xuất
router.get("/recommendations/:userId", getRecommendedCourses);

router.get("/", getCourses);

// --- PUT Routes ---

// Cập nhật bài học/ bài kiểm tra
router.put("/items/:itemType/:itemId", updateItem);
// Bật/tắt hiển thị bài học
router.put(
  "/items/:itemType/:itemId/visibility",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  toggleLessonVisibility,
);
// router.put("/:slug/sections/reorder", reorderSections);
// router.put("/:slug/sections/:sectionId/reorder", reorderItemsInSection);
// Cập nhật tên chương
router.put("/:slug/sections/:sectionId", updateSection);
// Cập nhật tiến độ khóa học
router.put("/:slug/progress", updateCourseProgress);
// Ẩn / Hiện khóa học
router.put(
  "/:slug/hide",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  hideCourse,
);
router.put(
  "/:slug/unhide",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  unhideCourse,
);
// Xuất bản / Hủy xuất bản khóa học
router.put(
  "/:slug/publish",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  publishCourse,
);
router.put(
  "/:slug/unpublish",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  unpublishCourse,
);
// Admin: khôi phục khóa học bị xóa mềm
router.put(
  "/:slug/restore",
  isAuthenticated,
  checkRole("admin"),
  restoreDeletedCourse,
);
// Cập nhật khóa học
router.put(
  "/:slug",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  updateCourse,
);

// --- POST Routes ---

// Thêm khóa học vào danh sách yêu thích
router.post("/favorite/:courseId/:userId", addCourseToFavorites);
// Đăng ký khóa học
router.post("/:slug/:userId/enroll", enrollCourse);
// Thêm bài học vào mục lục
router.post("/:slug/sections/:sectionId/items", addItemToSection);
// Thêm mục lục vào khóa học
router.post("/:slug/sections", addSection);
// Nộp bài kiểm tra
router.post("/assignments/:assignmentId/submit", submitQuiz);
// Tạo khóa học
router.post(
  "/",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  createCourse,
);

// --- DELETE Routes ---

// Xóa khóa học khỏi danh sách yêu thích
router.delete("/favorite/:courseId/:userId", removeCourseFromFavorites);
// Xóa bài học
router.delete("/:slug/sections/:sectionId/items/:itemId", deleteItem);
// Xóa chương
router.delete("/:slug/sections/:sectionId", deleteSection);
// Xóa khóa học (soft delete - giảng viên/admin)
router.delete(
  "/:slug",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  softDeleteCourse,
);

export default router;
