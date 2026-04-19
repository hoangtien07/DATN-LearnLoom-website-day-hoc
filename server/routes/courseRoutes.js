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
  startQuiz,
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
  getCoursesPendingReview,
  approveCourseReview,
  rejectCourseReview,
} from "../controllers/courseController.js";
import { validateBody, rules } from "../utils/validate.js";
import {
  isAuthenticated,
  checkRole,
  checkRoles,
} from "../middleware/isAuthenticated.js";
import { canAccessLesson } from "../middleware/canAccessLesson.js";

const router = express.Router();

// --- GET Routes ---

// Lấy bài học/ bài kiểm tra — chặn nếu khóa học trả phí mà user chưa enrolled.
router.get("/items/:itemType/:itemId", canAccessLesson(), getItem);
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
// Admin: danh sách khóa học chờ duyệt (BR-20).
router.get(
  "/admin/pending-review",
  isAuthenticated,
  checkRole("admin"),
  getCoursesPendingReview,
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
// Kéo-thả sắp xếp lại thứ tự chương (drag-drop).
// Instructor chỉ reorder course của mình (filter trong controller).
router.put(
  "/:slug/sections/reorder",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  reorderSections,
);
// Kéo-thả sắp xếp item trong một chương.
router.put(
  "/:slug/sections/:sectionId/reorder",
  isAuthenticated,
  checkRoles(["admin", "instructor"]),
  reorderItemsInSection,
);
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

// BR-20: Admin duyệt / từ chối khóa học chờ review.
router.put(
  "/:slug/review/approve",
  isAuthenticated,
  checkRole("admin"),
  approveCourseReview,
);
router.put(
  "/:slug/review/reject",
  isAuthenticated,
  checkRole("admin"),
  validateBody({
    rejectionReason: rules.string({ min: 5, max: 1000 }),
  }),
  rejectCourseReview,
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
// BR-12: Bắt đầu làm bài → server ghi startedAt, trả câu hỏi đã strip đáp án.
router.post(
  "/assignments/:assignmentId/start",
  isAuthenticated,
  startQuiz,
);
// Nộp bài kiểm tra (bắt buộc đăng nhập để enforce timer & max attempts).
router.post("/assignments/:assignmentId/submit", isAuthenticated, submitQuiz);
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
