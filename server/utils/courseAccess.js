// Helper quyết định user có quyền xem NỘI DUNG chi tiết của một khóa học hay không.
// Dùng ở getCourseBySlug / getSectionsByCourseSlug để tránh lộ content cho user chưa enrolled.
import User from "../models/User.js";

/**
 * @param {object} course - course doc (đã chứa price, teacher).
 * @param {object|null} user - req.user nếu có.
 * @returns {Promise<{canAccessFullContent: boolean, isEnrolled: boolean, reason: string}>}
 */
export const resolveCourseAccess = async (course, user) => {
  if (!course) {
    return { canAccessFullContent: false, isEnrolled: false, reason: "no_course" };
  }

  // Khóa học miễn phí → content mở.
  if (Number(course.price) <= 0) {
    return { canAccessFullContent: true, isEnrolled: false, reason: "free_course" };
  }

  // Guest / chưa login → không xem được content của khóa trả phí.
  if (!user) {
    return { canAccessFullContent: false, isEnrolled: false, reason: "guest" };
  }

  // Admin full access.
  if (user.role === "admin") {
    return { canAccessFullContent: true, isEnrolled: false, reason: "admin" };
  }

  // Instructor sở hữu khóa học.
  const teacherId = course.teacher?._id || course.teacher;
  if (teacherId && String(teacherId) === String(user._id)) {
    return { canAccessFullContent: true, isEnrolled: false, reason: "owner" };
  }

  // Học viên đã enrolled.
  const userDoc = await User.findById(user._id).select("enrolledCourses");
  const enrolled = userDoc?.enrolledCourses?.some(
    (e) => String(e.courseId) === String(course._id),
  );

  if (enrolled) {
    return { canAccessFullContent: true, isEnrolled: true, reason: "enrolled" };
  }

  return { canAccessFullContent: false, isEnrolled: false, reason: "not_enrolled" };
};

// Các field chứa nội dung trả phí — cần strip cho user chưa có quyền.
const SENSITIVE_LESSON_FIELDS = [
  "content",       // TextLesson
  "videoUrl",      // VideoLesson
  "audioUrl",      // AudioLesson
  "link",          // LiveLesson
];

// Assignment: ẩn đáp án đúng. Giữ lại câu hỏi để preview nếu isPreview (nhưng hiện model không có isPreview cho assignment — mặc định ẩn).
const sanitizeAssignment = (assignment) => {
  if (!assignment) return assignment;
  return {
    _id: assignment._id,
    name: assignment.name,
    description: assignment.description,
    timer: assignment.timer,
    allowRetake: assignment.allowRetake,
    questionCount: Array.isArray(assignment.questions)
      ? assignment.questions.length
      : 0,
    isLocked: true,
  };
};

const sanitizeLesson = (lesson) => {
  if (!lesson) return lesson;
  // Hỗ trợ cả Mongoose doc và plain object.
  const plain = typeof lesson.toObject === "function" ? lesson.toObject() : { ...lesson };

  for (const field of SENSITIVE_LESSON_FIELDS) {
    if (field in plain) delete plain[field];
  }
  plain.isLocked = true;
  return plain;
};

/**
 * Sanitize course doc sao cho các lesson/assignment không được truy cập bị strip content.
 * Những item có isPreview=true vẫn giữ full content.
 *
 * LƯU Ý: strip dữ liệu trong `item.itemData` (populated doc),
 * KHÔNG đụng `item.itemId` (string ID — FE cần để routing/delete/visibility).
 */
export const sanitizeCourseForViewer = (course, access) => {
  if (!course) return course;
  const plain = typeof course.toObject === "function" ? course.toObject() : { ...course };

  if (access.canAccessFullContent) {
    return plain;
  }

  if (!Array.isArray(plain.sections)) return plain;

  plain.sections = plain.sections.map((section) => {
    const items = Array.isArray(section.items) ? section.items : [];
    return {
      ...section,
      items: items.map((item) => {
        const itemDoc = item.itemData;
        if (!itemDoc || typeof itemDoc !== "object") {
          return item;
        }
        if (item.itemType === "lesson") {
          if (itemDoc.isPreview) {
            return item; // preview giữ nguyên
          }
          return { ...item, itemData: sanitizeLesson(itemDoc) };
        }
        if (item.itemType === "assignment") {
          return { ...item, itemData: sanitizeAssignment(itemDoc) };
        }
        return item;
      }),
    };
  });

  return plain;
};
