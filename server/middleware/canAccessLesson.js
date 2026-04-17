// Middleware kiểm soát quyền truy cập nội dung bài học / bài tập.
// Luồng: preview → admin → teacher sở hữu → học viên đã enrolled → khóa học miễn phí.
import mongoose from "mongoose";
import Course from "../models/Course.js";
import { Lesson } from "../models/Lesson.js";
import Assignment from "../models/Assignments.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

const isValidId = (id) => id && mongoose.Types.ObjectId.isValid(id);

const findCourseForItem = async (itemType, itemId) => {
  if (!isValidId(itemId)) return { error: { status: 400, message: "itemId không hợp lệ" } };

  if (itemType === "lesson") {
    const lesson = await Lesson.findById(itemId).select("course isPreview visible");
    if (!lesson) return { error: { status: 404, message: "Lesson not found" } };
    if (!lesson.visible) return { error: { status: 404, message: "Lesson not found" } };
    return { lesson, courseId: lesson.course };
  }

  if (itemType === "assignment") {
    const assignment = await Assignment.findById(itemId).select("course");
    if (!assignment) return { error: { status: 404, message: "Assignment not found" } };
    return { assignment, courseId: assignment.course };
  }

  return { error: { status: 400, message: "itemType không hợp lệ" } };
};

/**
 * Middleware yêu cầu user phải có quyền xem item (lesson/assignment).
 * Trả về 403 nếu khóa học trả phí mà user chưa enrolled và bài không phải preview.
 *
 * @param {object} options
 * @param {string} [options.itemTypeParam]  - tên param chứa itemType (mặc định "itemType")
 * @param {string} [options.itemIdParam]    - tên param chứa itemId   (mặc định "itemId")
 * @param {string} [options.lessonIdParam]  - nếu route dùng lessonId, ép itemType = "lesson"
 */
export const canAccessLesson = (options = {}) => {
  const {
    itemTypeParam = "itemType",
    itemIdParam = "itemId",
    lessonIdParam,
  } = options;

  return async (req, res, next) => {
    try {
      const itemType = lessonIdParam ? "lesson" : req.params[itemTypeParam];
      const itemId = lessonIdParam ? req.params[lessonIdParam] : req.params[itemIdParam];

      const { lesson, courseId, error } = await findCourseForItem(itemType, itemId);
      if (error) return res.status(error.status).json({ message: error.message });

      // Lesson preview → ai cũng xem được, kể cả guest.
      if (lesson?.isPreview) {
        return next();
      }

      const course = await Course.findById(courseId).select(
        "price teacher is_deleted",
      );
      if (!course || course.is_deleted) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Khóa học miễn phí → cho phép xem (nghiệp vụ hiện tại).
      // Nếu muốn bắt enrolled kể cả khi free, đổi điều kiện này.
      if (Number(course.price) <= 0) {
        return next();
      }

      // Các luồng sau đều cần đăng nhập.
      if (!req.isAuthenticated?.() || !req.user) {
        return res
          .status(401)
          .json({ message: "Bạn cần đăng nhập để xem nội dung này" });
      }

      // Admin → full access.
      if (req.user.role === "admin") {
        return next();
      }

      // Instructor sở hữu khóa học → full access (để preview/test nội dung).
      if (String(course.teacher) === String(req.user._id)) {
        return next();
      }

      // Học viên đã enrolled.
      const user = await User.findById(req.user._id).select("enrolledCourses");
      const enrolled = user?.enrolledCourses?.some(
        (e) => String(e.courseId) === String(courseId),
      );

      if (!enrolled) {
        return res.status(403).json({
          code: "NOT_ENROLLED",
          message: "Bạn cần đăng ký khóa học để xem nội dung này",
        });
      }

      return next();
    } catch (err) {
      logger.error({ err }, "canAccessLesson middleware error");
      return res.status(500).json({ message: "Lỗi server" });
    }
  };
};
