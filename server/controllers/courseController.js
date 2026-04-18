// server/controllers/courseController.js
import Course from "../models/Course.js";
import {
  Lesson,
  TextLessonModel,
  VideoLessonModel,
  AudioLessonModel,
  LiveLessonModel,
} from "../models/Lesson.js";
import Assignment from "../models/Assignments.js";
import { AssignmentResult } from "../models/Assignments.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { recordAudit } from "../utils/audit.js";
import {
  resolveCourseAccess,
  sanitizeCourseForViewer,
} from "../utils/courseAccess.js";

const normalizeTotalDuration = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return NaN;
  }

  return Math.round(parsed * 10) / 10;
};
// ------------------------------------
// CRUD for Courses
// ------------------------------------

// Create a new course
export const createCourse = async (req, res) => {
  try {
    const {
      name,
      summary,
      description,
      teacher,
      overviewVideo,
      level,
      subject,
      totalLessons,
      totalDuration,
      slug,
      totalStudentsEnrolled,
      visible,
      image_url,
      price,
      old_price,
      is_published,
      is_selling,
      published_at,
      sections,
      reviews,
    } = req.body;

    const normalizedTotalDuration = normalizeTotalDuration(totalDuration);
    // Chỉ báo lỗi khi người dùng có nhập totalDuration nhưng giá trị không hợp lệ.
    // Khi tạo bản nháp (chưa có bài học) cho phép để trống.
    if (Number.isNaN(normalizedTotalDuration)) {
      return res.status(400).json({
        message: "totalDuration phải là số giờ lớn hơn 0",
      });
    }

    if (is_published === true && normalizedTotalDuration === null) {
      return res.status(400).json({
        message: "Cần nhập totalDuration khi xuất bản khóa học",
      });
    }

    // Kiểm tra giáo viên có tồn tại
    const teacherExists = await User.findById(teacher);
    if (!teacherExists) {
      return res.status(400).json({ message: "Teacher not found" });
    }

    // Kiểm tra slug trùng để trả lỗi rõ ràng thay vì 500 duplicate key
    if (slug) {
      const slugTaken = await Course.findOne({ slug }).select("_id");
      if (slugTaken) {
        return res.status(409).json({
          code: "COURSE_SLUG_TAKEN",
          message: "Slug đã được sử dụng, vui lòng chọn slug khác",
        });
      }
    }

    const coursePayload = {
      name,
      summary,
      description,
      teacher: teacherExists,
      overviewVideo,
      level,
      subject,
      totalLessons,
      slug,
      totalStudentsEnrolled,
      visible,
      image_url,
      price,
      old_price,
      is_published: is_published ?? false,
      is_selling,
      published_at,
      sections,
      reviews,
    };

    if (normalizedTotalDuration !== null) {
      coursePayload.totalDuration = normalizedTotalDuration;
    }

    const course = new Course(coursePayload);

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a course
export const updateCourse = async (req, res) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body, "totalDuration")) {
      const normalizedTotalDuration = normalizeTotalDuration(
        req.body.totalDuration,
      );

      if (
        normalizedTotalDuration === null ||
        Number.isNaN(normalizedTotalDuration)
      ) {
        return res.status(400).json({
          message: "totalDuration phải là số giờ lớn hơn 0",
        });
      }

      req.body.totalDuration = normalizedTotalDuration;
    }

    const filter = { slug: req.params.slug };
    // Giảng viên chỉ sửa khóa học của mình
    if (req.user && req.user.role === "instructor") {
      filter.teacher = req.user._id;
    }

    // Không cho chuyển về nháp nếu khóa học đã có học viên theo học.
    if (
      Object.prototype.hasOwnProperty.call(req.body, "is_published") &&
      req.body.is_published === false
    ) {
      const existingCourse = await Course.findOne(filter).select(
        "is_published totalStudentsEnrolled",
      );

      if (!existingCourse) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (
        existingCourse.is_published &&
        (existingCourse.totalStudentsEnrolled || 0) > 0
      ) {
        return res.status(409).json({
          code: "COURSE_HAS_ENROLLED_STUDENTS",
          message:
            "Khóa học đang có học viên theo học nên không thể chuyển về bản nháp. Hãy dùng thao tác ẩn/ngừng bán để dừng nhận học viên mới.",
        });
      }
    }

    const course = await Course.findOneAndUpdate(filter, req.body, {
      new: true,
    });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Soft delete a course giảng viên (is_deleted = true, admin vẫn xem được)
export const softDeleteCourse = async (req, res) => {
  try {
    const filter = { slug: req.params.slug };
    if (req.user && req.user.role === "instructor") {
      filter.teacher = req.user._id;
    }
    const course = await Course.findOneAndUpdate(
      filter,
      { is_deleted: true },
      { new: true },
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    recordAudit({
      actorId: req.user?._id,
      actorRole: req.user?.role,
      action: "course.soft_delete",
      targetType: "Course",
      targetId: course._id,
      metadata: { slug: course.slug },
    });
    res.json({ message: "Course soft deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ẩn khóa học (visible = false), có thể khôi phục
export const hideCourse = async (req, res) => {
  try {
    const filter = { slug: req.params.slug, is_deleted: { $ne: true } };
    if (req.user && req.user.role === "instructor") {
      filter.teacher = req.user._id;
    }
    const course = await Course.findOneAndUpdate(
      filter,
      { visible: false },
      { new: true },
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ message: "Course hidden", course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hiện lại khóa học (visible = true)
export const unhideCourse = async (req, res) => {
  try {
    const filter = { slug: req.params.slug, is_deleted: { $ne: true } };
    if (req.user && req.user.role === "instructor") {
      filter.teacher = req.user._id;
    }
    const course = await Course.findOneAndUpdate(
      filter,
      { visible: true },
      { new: true },
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ message: "Course visible", course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// BR-20: "Publish" được tái định nghĩa theo 2 con đường:
//   - Instructor gọi publish → nếu đã từng được admin approved thì xuất bản luôn;
//     nếu chưa, chuyển reviewStatus = "pending" và chờ admin duyệt.
//   - Admin gọi publish → xuất bản trực tiếp (admin override).
export const publishCourse = async (req, res) => {
  try {
    const filter = { slug: req.params.slug, is_deleted: { $ne: true } };
    if (req.user && req.user.role === "instructor") {
      filter.teacher = req.user._id;
    }

    const course = await Course.findOne(filter);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const isAdmin = req.user?.role === "admin";

    if (isAdmin) {
      course.is_published = true;
      course.published_at = new Date();
      course.reviewStatus = "approved";
      course.reviewedBy = req.user._id;
      course.reviewedAt = new Date();
      course.reviewRejectionReason = undefined;
      await course.save();

      recordAudit({
        actorId: req.user._id,
        actorRole: req.user.role,
        action: "course.publish_admin",
        targetType: "Course",
        targetId: course._id,
        metadata: { slug: course.slug },
      });
      return res.json({ message: "Course published by admin", course });
    }

    // Instructor flow
    // Đã được admin approve trước đó → publish luôn (tức bật lại).
    if (course.reviewStatus === "approved") {
      course.is_published = true;
      course.published_at = course.published_at || new Date();
      await course.save();
      recordAudit({
        actorId: req.user._id,
        actorRole: req.user.role,
        action: "course.publish",
        targetType: "Course",
        targetId: course._id,
        metadata: { slug: course.slug },
      });
      return res.json({ message: "Course published", course });
    }

    if (course.reviewStatus === "pending") {
      return res.status(409).json({
        code: "REVIEW_PENDING",
        message: "Khóa học đang chờ admin duyệt",
      });
    }

    // "none" hoặc "rejected" → submit review.
    course.reviewStatus = "pending";
    course.reviewSubmittedAt = new Date();
    course.reviewRejectionReason = undefined;
    // Chưa public cho học viên.
    course.is_published = false;
    await course.save();

    recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "course.submit_review",
      targetType: "Course",
      targetId: course._id,
      metadata: { slug: course.slug },
    });

    return res.json({
      message: "Đã gửi yêu cầu duyệt, khóa học sẽ được xuất bản sau khi admin chấp nhận",
      course,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// BR-20: Admin xem danh sách course đang chờ duyệt.
export const getCoursesPendingReview = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;

    const filter = {
      reviewStatus: "pending",
      is_deleted: { $ne: true },
    };

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .sort({ reviewSubmittedAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate("teacher", "username email thumbnail"),
      Course.countDocuments(filter),
    ]);

    res.json({
      data: courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error listing pending courses");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// BR-20: Admin duyệt khóa học → approved + is_published.
export const approveCourseReview = async (req, res) => {
  try {
    const course = await Course.findOne({
      slug: req.params.slug,
      is_deleted: { $ne: true },
    });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.reviewStatus !== "pending") {
      return res.status(409).json({
        code: "NOT_PENDING",
        message: "Khóa học không ở trạng thái chờ duyệt",
      });
    }

    course.reviewStatus = "approved";
    course.reviewedBy = req.user._id;
    course.reviewedAt = new Date();
    course.reviewRejectionReason = undefined;
    course.is_published = true;
    course.published_at = course.published_at || new Date();
    await course.save();

    recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "course.review_approve",
      targetType: "Course",
      targetId: course._id,
      metadata: { slug: course.slug },
    });

    res.json({ message: "Course approved & published", course });
  } catch (error) {
    logger.error({ err: error }, "Error approving course review");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// BR-20: Admin từ chối khóa học.
export const rejectCourseReview = async (req, res) => {
  try {
    const { rejectionReason } = req.validatedBody || req.body;

    const course = await Course.findOne({
      slug: req.params.slug,
      is_deleted: { $ne: true },
    });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.reviewStatus !== "pending") {
      return res.status(409).json({
        code: "NOT_PENDING",
        message: "Khóa học không ở trạng thái chờ duyệt",
      });
    }

    course.reviewStatus = "rejected";
    course.reviewedBy = req.user._id;
    course.reviewedAt = new Date();
    course.reviewRejectionReason = rejectionReason;
    course.is_published = false;
    await course.save();

    recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "course.review_reject",
      targetType: "Course",
      targetId: course._id,
      metadata: { slug: course.slug },
    });

    res.json({ message: "Course review rejected", course });
  } catch (error) {
    logger.error({ err: error }, "Error rejecting course review");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Bỏ xuất bản khóa học (về bản nháp)
export const unpublishCourse = async (req, res) => {
  try {
    const filter = { slug: req.params.slug, is_deleted: { $ne: true } };
    if (req.user && req.user.role === "instructor") {
      filter.teacher = req.user._id;
    }
    const currentCourse = await Course.findOne(filter).select(
      "is_published totalStudentsEnrolled",
    );

    if (!currentCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (
      currentCourse.is_published &&
      (currentCourse.totalStudentsEnrolled || 0) > 0
    ) {
      return res.status(409).json({
        code: "COURSE_HAS_ENROLLED_STUDENTS",
        message:
          "Khóa học đang có học viên theo học nên không thể chuyển về bản nháp. Hãy dùng thao tác ẩn/ngừng bán để dừng nhận học viên mới.",
      });
    }

    const course = await Course.findOneAndUpdate(
      filter,
      { is_published: false },
      { new: true },
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ message: "Course unpublished", course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh sách khóa học đã ẩn của giảng viên
export const getHiddenCoursesByInstructor = async (req, res) => {
  try {
    const courses = await Course.find({
      teacher: req.params.instructorId,
      visible: false,
      is_deleted: { $ne: true },
    }).populate("teacher");
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: lấy danh sách khóa học bị xóa mềm
export const getDeletedCoursesAdmin = async (req, res) => {
  try {
    const courses = await Course.find({ is_deleted: true }).populate("teacher");
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: khôi phục khóa học bị xóa mềm
export const restoreDeletedCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { slug: req.params.slug, is_deleted: true },
      { is_deleted: false },
      { new: true },
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    recordAudit({
      actorId: req.user?._id,
      actorRole: req.user?.role,
      action: "course.restore",
      targetType: "Course",
      targetId: course._id,
      metadata: { slug: course.slug },
    });
    res.json({ message: "Course restored", course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bật/tắt hiển thị bài học
export const toggleLessonVisibility = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    if (itemType !== "lesson") {
      return res
        .status(400)
        .json({ message: "Only lessons support visibility toggle" });
    }
    const lesson = await Lesson.findById(itemId);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    lesson.visible = !lesson.visible;
    await lesson.save();
    res.json({ message: "Lesson visibility updated", visible: lesson.visible });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const deletedCourse = await Course.findOneAndDelete({
      slug: req.params.slug,
    });
    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }
    recordAudit({
      actorId: req.user?._id,
      actorRole: req.user?.role,
      action: "course.hard_delete",
      targetType: "Course",
      targetId: deletedCourse._id,
      metadata: { slug: deletedCourse.slug },
    });
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------------------------
// GET functions for Courses
// ------------------------------------

// Manual batch-populate sections.items.
// LÝ DO: itemSchema dùng `refPath: "itemType"` với giá trị "lesson"/"assignment"
// lowercase, nhưng model đăng ký là "Lesson"/"Assignment" (case-sensitive).
// Mongoose populate silently fail → itemId vẫn là ObjectId string.
// 2 query batch thay cho populate để hoạt động bất chấp case mismatch.
//
// QUAN TRỌNG: KHÔNG replace item.itemId (vẫn giữ là string ID để các page FE
// cũ dùng cho routing/xóa/toggle visibility không bị break). Thay vào đó, lưu
// populated doc vào item.itemData — FE đọc name/content từ đây.
const populateSectionItems = async (course) => {
  if (!course?.sections?.length) return course;

  const lessonIds = [];
  const assignmentIds = [];

  for (const section of course.sections) {
    if (!Array.isArray(section.items)) continue;
    for (const item of section.items) {
      if (!item.itemId) continue;
      if (item.itemType === "lesson") lessonIds.push(item.itemId);
      else if (item.itemType === "assignment") assignmentIds.push(item.itemId);
    }
  }

  const [lessons, assignments] = await Promise.all([
    lessonIds.length ? Lesson.find({ _id: { $in: lessonIds } }).lean() : [],
    assignmentIds.length
      ? Assignment.find({ _id: { $in: assignmentIds } }).lean()
      : [],
  ]);

  const lessonMap = new Map(lessons.map((l) => [String(l._id), l]));
  const assignmentMap = new Map(assignments.map((a) => [String(a._id), a]));

  for (const section of course.sections) {
    if (!Array.isArray(section.items)) continue;
    for (const item of section.items) {
      if (!item.itemId) continue;
      const key = String(item.itemId);
      const doc =
        item.itemType === "lesson"
          ? lessonMap.get(key)
          : item.itemType === "assignment"
            ? assignmentMap.get(key)
            : null;
      if (doc) {
        item.itemData = doc;
        item.itemId = key; // chuẩn hóa về string (đề phòng ObjectId)
      }
    }
  }

  return course;
};

// Get course by slug
// Sanitize content của lesson/assignment khi user chưa có quyền xem (guest, chưa enroll).
export const getCourseBySlug = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate("teacher")
      .lean();

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    await populateSectionItems(course);

    const access = await resolveCourseAccess(course, req.user || null);
    const payload = sanitizeCourseForViewer(course, access);
    payload.viewerAccess = {
      canAccessFullContent: access.canAccessFullContent,
      isEnrolled: access.isEnrolled,
    };

    res.json(payload);
  } catch (error) {
    logger.error({ err: error }, "Error fetching course by slug");
    res.status(500).json({ error: error.message });
  }
};

export const getCourseByInstructor = async (req, res) => {
  try {
    const courses = await Course.find({
      teacher: req.params.instructorId,
      is_deleted: { $ne: true },
    }).populate("teacher");
    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses found for this instructor" });
    }
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all courses (with optional filters + pagination)
export const getCourses = async (req, res) => {
  try {
    const { subjects, levels, durations, prices } = req.query;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;

    const filters = {
      visible: true,
      is_published: true,
      is_deleted: { $ne: true },
    };
    const andConditions = [];

    if (subjects) {
      andConditions.push({ subject: { $in: subjects.split(",") } });
    }
    if (levels) {
      andConditions.push({ level: { $in: levels.split(",") } });
    }
    if (durations) {
      const durationQueries = durations.split(",").map((duration) => {
        if (duration === "Hơn 40 giờ") {
          return { totalDuration: { $gte: 40 } };
        } else {
          const [min, max] = duration.split("-");
          return { totalDuration: { $gte: parseInt(min), $lt: parseInt(max) } };
        }
      });
      if (durationQueries.length > 0) {
        andConditions.push({ $or: durationQueries });
      }
    }
    if (prices) {
      const priceQueries = [];
      if (prices.includes("Miễn phí")) {
        priceQueries.push({ price: 0 });
      }
      if (prices.includes("Có trả phí")) {
        priceQueries.push({ price: { $gt: 0 } });
      }
      if (priceQueries.length > 0) {
        andConditions.push({ $or: priceQueries });
      }
    }

    if (andConditions.length > 0) {
      filters.$and = andConditions;
    }

    const [courses, total] = await Promise.all([
      Course.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("teacher", "username thumbnail"),
      Course.countDocuments(filters),
    ]);

    res.json({
      data: courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------------------------
// Functions for Sections and Items
// ------------------------------------

// Add a new section
export const addSection = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name } = req.body;

    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.sections.push({ name });
    await course.save();

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all sections — sanitize giống getCourseBySlug.
export const getSectionsByCourseSlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const course = await Course.findOne({ slug })
      .populate("teacher", "_id")
      .lean();

    if (!course) {
      return res.status(404).json({ message: "Section not found" });
    }

    await populateSectionItems(course);

    const access = await resolveCourseAccess(course, req.user || null);
    const payload = sanitizeCourseForViewer(course, access);
    res.json(payload.sections);
  } catch (error) {
    logger.error({ err: error }, "Error fetching sections by course slug");
    res.status(500).json({ error: error.message });
  }
};

// Update a section
export const updateSection = async (req, res) => {
  try {
    const { slug, sectionId } = req.params;
    const { name } = req.body;

    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const section = course.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    section.name = name;

    await course.save();

    res.json(section);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a section
export const deleteSection = async (req, res) => {
  try {
    const { slug, sectionId } = req.params;

    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Tìm section bằng _id
    const sectionIndex = course.sections.findIndex(
      (section) => section._id.toString() === sectionId,
    );

    if (sectionIndex === -1) {
      return res.status(404).json({ message: "Section not found" });
    }

    // Xóa section khỏi mảng
    course.sections.splice(sectionIndex, 1);

    await course.save();

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hàm di chuyển item trong mảng
const moveArrayItem = (arr, fromIndex, toIndex) => {
  const [item] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, item);
  return arr;
};

// Sắp xếp lại thứ tự các section
export const reorderSections = async (req, res) => {
  try {
    const { slug } = req.params;
    const { startIndex, endIndex } = req.body;

    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.sections = moveArrayItem(course.sections, startIndex, endIndex);
    await course.save();

    res.json(course.sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assignment
// ------------------------------------

// Lấy assignment theo ID
export const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lessons
// ------------------------------------

// Get a lesson by ID (This function can be used for any section)
export const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;

    // Tìm lesson bằng _id (sử dụng Lesson model)
    const lesson = await Lesson.findById(lessonId).populate("course");

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    // Lấy dữ liệu cụ thể của loại bài học
    let specificLesson;
    switch (lesson.type) {
      case "TextLesson":
        specificLesson = await TextLessonModel.findById(lessonId);
        break;
      case "VideoLesson":
        specificLesson = await VideoLessonModel.findById(lessonId);
        break;
      case "AudioLesson":
        specificLesson = await AudioLessonModel.findById(lessonId);
        break;
      case "LiveLesson":
        specificLesson = await LiveLessonModel.findById(lessonId);
        break;
      default:
        return res.status(400).json({ message: "Invalid lesson type" });
    }

    res.json(specificLesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------------------------
// Functions for Items
// ------------------------------------

// Thêm một item (lesson hoặc assignment) vào một section
export const addItemToSection = async (req, res) => {
  try {
    const { slug, sectionId } = req.params;
    const { itemType, ...itemData } = req.body;

    const course = await Course.findOne({ slug });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const section = course.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    let newItem;
    itemData.course = course._id;
    if (itemType === "lesson") {
      const { type } = itemData;
      switch (type) {
        case "TextLesson":
          newItem = new TextLessonModel(itemData);
          break;
        case "VideoLesson":
          newItem = new VideoLessonModel(itemData);
          break;
        case "AudioLesson":
          newItem = new AudioLessonModel(itemData);
          break;
        case "LiveLesson":
          newItem = new LiveLessonModel(itemData);
          break;
        default:
          return res.status(400).json({ message: "Invalid lesson type" });
      }
      await newItem.save();
    } else if (itemType === "assignment") {
      newItem = new Assignment(itemData);
      await newItem.save();
    } else {
      return res.status(400).json({ message: "Invalid item type" });
    }

    section.items.push({
      itemType,
      itemId: newItem._id,
      order: section.items.length,
    });

    await course.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: `Error adding item: ${error.message}` });
  }
};

// Lấy dữ liệu một item (lesson hoặc assignment)
export const getItem = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    let item;

    if (itemType === "lesson") {
      // Tìm lesson bằng _id (sử dụng Lesson model)
      item = await Lesson.findOne({ _id: itemId }).populate("course");

      if (!item) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Lấy dữ liệu cụ thể của loại bài học
      switch (item.type) {
        case "TextLesson":
          item = await TextLessonModel.findOne({ _id: itemId });
          break;
        case "VideoLesson":
          item = await VideoLessonModel.findOne({ _id: itemId });
          break;
        case "AudioLesson":
          item = await AudioLessonModel.findOne({ _id: itemId });
          break;
        case "LiveLesson":
          item = await LiveLessonModel.findOne({ _id: itemId });
          break;
        default:
          return res.status(400).json({ message: "Invalid lesson type" });
      }
    } else if (itemType === "assignment") {
      // Tìm assignment bằng _id
      item = await Assignment.findOne({ _id: itemId }).populate("course");

      if (!item) {
        return res.status(404).json({ message: "Assignment not found" });
      }
    } else {
      return res.status(400).json({ message: "Invalid item type" });
    }

    res.json(item);
  } catch (error) {
    logger.error({ err: error }, "Lỗi khi lấy item");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật một item (lesson hoặc assignment)
export const updateItem = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const updatedItemData = req.body;

    let updatedItem;

    if (itemType === "lesson") {
      // Tìm lesson để lấy type hiện tại
      const existingLesson = await Lesson.findById(itemId);

      if (!existingLesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Tìm và cập nhật lesson dựa vào type hiện tại
      switch (existingLesson.type) {
        case "TextLesson":
          updatedItem = await TextLessonModel.findByIdAndUpdate(
            itemId,
            updatedItemData,
            { new: true },
          );
          break;
        case "VideoLesson":
          updatedItem = await VideoLessonModel.findByIdAndUpdate(
            itemId,
            updatedItemData,
            { new: true },
          );
          break;
        case "AudioLesson":
          updatedItem = await AudioLessonModel.findByIdAndUpdate(
            itemId,
            updatedItemData,
            { new: true },
          );
          break;
        case "LiveLesson":
          updatedItem = await LiveLessonModel.findByIdAndUpdate(
            itemId,
            updatedItemData,
            { new: true },
          );
          break;
        default:
          return res.status(400).json({ message: "Invalid lesson type" });
      }
    } else if (itemType === "assignment") {
      updatedItem = await Assignment.findByIdAndUpdate(
        itemId,
        updatedItemData,
        {
          new: true,
        },
      );
    } else {
      return res.status(400).json({ message: "Invalid item type" });
    }

    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(updatedItem);
  } catch (error) {
    logger.error({ err: error }, "Lỗi khi cập nhật item");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa một item
export const deleteItem = async (req, res) => {
  try {
    const { slug, sectionId, itemId } = req.params;

    // Tìm course và section
    const course = await Course.findOne({ slug });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const section = course.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    // Tìm và xóa item từ section
    const itemIndex = section.items.findIndex((item) =>
      item.itemId.equals(itemId),
    );
    if (itemIndex === -1)
      return res.status(404).json({ message: "Item not found in section" });

    section.items.splice(itemIndex, 1);

    // Xóa item từ collection của nó
    await Lesson.findByIdAndDelete(itemId);
    await Assignment.findByIdAndDelete(itemId);

    await course.save();

    res.json({ message: "Item deleted successfully", course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Sắp xếp lại các item trong một section
export const reorderItemsInSection = async (req, res) => {
  try {
    const { slug, sectionId } = req.params;
    const { startIndex, endIndex } = req.body;

    const course = await Course.findOne({ slug });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const section = course.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    section.items = moveArrayItem(section.items, startIndex, endIndex);

    await course.save();

    res.json(section.items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const enrollCourse = async (req, res) => {
  try {
    const { slug, userId } = req.params;

    // Find the course
    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already enrolled
    const existingEnrollment = user.enrolledCourses.find(
      (enrollment) => enrollment.courseId.toString() === course._id.toString(),
    );
    if (existingEnrollment) {
      return res
        .status(400)
        .json({ message: "Already enrolled in this course" });
    }

    course.totalStudentsEnrolled++;
    await course.save();
    user.enrolledCourses.push({ courseId: course._id });
    await user.save();

    res.json({ message: "Successfully enrolled in course", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update course progress (call this API when a lesson/assignment is completed)
export const updateCourseProgress = async (req, res) => {
  try {
    const { slug } = req.params;
    const { itemId, userId } = req.body;

    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const enrollment = user.enrolledCourses.find(
      (enrollment) => enrollment.courseId.toString() === course._id.toString(),
    );
    if (!enrollment) {
      return res.status(400).json({ message: "Not enrolled in this course" });
    }

    // Add the completed item to the list
    if (!enrollment.completedItems.includes(itemId)) {
      enrollment.completedItems.push(itemId);
    }

    // Calculate progress
    const totalItems = course.sections.reduce(
      (total, section) => total + section.items.length,
      0,
    );
    enrollment.progress =
      totalItems > 0
        ? Math.round((enrollment.completedItems.length / totalItems) * 100)
        : 0;
    enrollment.lastAccessed = new Date();

    await user.save();

    res.json({ message: "Progress updated", progress: enrollment.progress });
  } catch (error) {
    logger.error({ err: error }, "Error updating progress");
    res.status(500).json({ message: "Server error" });
  }
};

// Strip `isCorrect` và field nhạy cảm khỏi câu hỏi khi phát cho học sinh đang làm bài (BR-14).
const sanitizeQuestionsForQuiz = (questions = []) =>
  questions.map((q) => ({
    _id: q._id,
    questionText: q.questionText,
    options: (q.options || []).map((opt) => ({
      _id: opt._id,
      text: opt.text,
    })),
  }));

// BR-12: học sinh bắt đầu làm bài — tạo (hoặc reuse) AssignmentResult và ghi startedAt.
// Server sẽ dùng startedAt + assignment.timer để enforce thời gian khi submit.
export const startQuiz = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    let result = await AssignmentResult.findOne({
      assignment: assignmentId,
      student: userId,
    });

    const maxAttempts = Number(assignment.maxAttempts) || 0; // 0 = không giới hạn
    const timerMinutes = Number(assignment.timer) || 0;

    if (result) {
      if (result.isFinal) {
        return res.status(409).json({
          code: "ASSIGNMENT_COMPLETED",
          message: "Bạn đã hoàn tất bài này và không thể làm lại",
        });
      }
      if (!assignment.allowRetake && result.attempts > 0) {
        return res.status(409).json({
          code: "RETAKE_NOT_ALLOWED",
          message: "Bài này không cho phép làm lại",
        });
      }
      if (
        assignment.allowRetake &&
        maxAttempts > 0 &&
        result.attempts >= maxAttempts
      ) {
        return res.status(409).json({
          code: "MAX_ATTEMPTS_REACHED",
          message: "Bạn đã dùng hết số lần làm bài",
        });
      }
      // Nếu đã có startedAt mà chưa quá hạn → reuse (cho phép tải lại trang).
      if (
        timerMinutes > 0 &&
        result.startedAt &&
        Date.now() - new Date(result.startedAt).getTime() <
          timerMinutes * 60 * 1000
      ) {
        // giữ nguyên startedAt
      } else {
        result.startedAt = new Date();
      }
    } else {
      result = new AssignmentResult({
        assignment: assignmentId,
        student: userId,
        startedAt: new Date(),
        attempts: 0,
      });
    }

    await result.save();

    const deadline =
      timerMinutes > 0
        ? new Date(
            new Date(result.startedAt).getTime() + timerMinutes * 60 * 1000,
          )
        : null;

    res.json({
      assignmentId,
      startedAt: result.startedAt,
      deadline,
      timerMinutes,
      attempt: result.attempts + 1,
      maxAttempts,
      questions: sanitizeQuestionsForQuiz(assignment.questions),
    });
  } catch (error) {
    logger.error({ err: error }, "Error starting quiz");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Hàm nộp bài kiểm tra (BR-12 + BR-14)
export const submitQuiz = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userIdFromAuth = req.user?._id;
    const { answers } = req.body;

    if (!userIdFromAuth) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = userIdFromAuth;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    let result = await AssignmentResult.findOne({
      assignment: assignmentId,
      student: userId,
    });

    if (!result || !result.startedAt) {
      return res.status(400).json({
        code: "NOT_STARTED",
        message: "Bạn chưa bắt đầu làm bài. Hãy nhấn 'Bắt đầu' trước khi nộp.",
      });
    }
    if (result.isFinal) {
      return res.status(409).json({
        code: "ASSIGNMENT_COMPLETED",
        message: "Bài đã hoàn tất, không được nộp lại.",
      });
    }

    const maxAttempts = Number(assignment.maxAttempts) || 0;
    const timerMinutes = Number(assignment.timer) || 0;

    // BR-12: Enforce timer. Cho phép 10 giây lệch network.
    if (timerMinutes > 0) {
      const elapsedMs = Date.now() - new Date(result.startedAt).getTime();
      const limitMs = timerMinutes * 60 * 1000 + 10_000;
      if (elapsedMs > limitMs) {
        // Vẫn chấm nhưng đánh dấu "expired" và không tính thêm attempt retake.
        result.isFinal = true;
        result.submittedAt = new Date();
        await result.save();
        return res.status(408).json({
          code: "TIMER_EXPIRED",
          message: "Đã quá thời gian làm bài. Bài không được ghi nhận.",
        });
      }
    }

    // Chấm điểm.
    let score = 0;
    const resultDetails = assignment.questions.map((question) => {
      const userAnswerObject = (answers || []).find(
        (a) => a.questionId === question._id.toString(),
      );
      const userAnswer = userAnswerObject
        ? (userAnswerObject.selectedOptions || []).map((e) => e.userAnswer)
        : [];
      const correctOptions = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.text);
      const isCorrect =
        userAnswer.length === correctOptions.length &&
        userAnswer.every((a) => correctOptions.includes(a));
      if (isCorrect) score++;
      return {
        questionId: question._id,
        userAnswer,
        isCorrect,
      };
    });

    result.answers = resultDetails.map((d) => ({
      questionId: d.questionId,
      selectedOptions: { userAnswer: d.userAnswer, isCorrect: d.isCorrect },
    }));
    result.score = score;
    result.submittedAt = new Date();
    result.attempts = (result.attempts || 0) + 1;

    // Xác định đã "chốt" hay chưa (BR-14: chốt → BE mới trả đáp án đúng).
    const attemptsUsed = result.attempts;
    const canRetake =
      assignment.allowRetake &&
      (maxAttempts === 0 || attemptsUsed < maxAttempts);
    result.isFinal = !canRetake;

    // Reset startedAt để nếu được retake phải start lại.
    result.startedAt = undefined;

    await result.save();

    // BR-14: chỉ trả correctAnswer khi đã chốt.
    const totalScore = assignment.questions.length;
    const payload = {
      message: "Nộp bài thành công!",
      score,
      totalScore,
      attemptsUsed,
      maxAttempts,
      isFinal: result.isFinal,
      canRetake,
    };

    if (result.isFinal) {
      payload.answers = assignment.questions.map((question) => {
        const detail = resultDetails.find(
          (d) => String(d.questionId) === String(question._id),
        );
        return {
          questionId: question._id,
          questionText: question.questionText,
          userAnswer: detail?.userAnswer || [],
          correctAnswer: question.options
            .filter((o) => o.isCorrect)
            .map((o) => o.text),
          isCorrect: detail?.isCorrect || false,
          explanation: question.explanation,
        };
      });
    } else {
      // Chưa chốt: chỉ biết đúng/sai cho từng câu, KHÔNG lộ đáp án.
      payload.answers = resultDetails.map((d) => ({
        questionId: d.questionId,
        isCorrect: d.isCorrect,
      }));
    }

    res.json(payload);
  } catch (error) {
    logger.error({ err: error }, "Lỗi khi nộp bài tập");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cung cấp kết quả và thống kê cho giáo viên
export const getAllResultOfAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const results = await AssignmentResult.find({ assignment: assignmentId })
      .populate("student", "name email") // Lấy thông tin học sinh
      .sort({ submittedAt: -1 }); // Sắp xếp theo thời gian nộp

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy kết quả bài tập", error });
  }
};

// Trạng thái bài kiểm tra (mở rộng BR-12: báo thêm attempts & deadline).
export const getUserAssignmentStatus = async (req, res) => {
  const assignmentId = req.params.assignmentId;
  const userId = req.params.userId;

  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    const result = await AssignmentResult.findOne({
      assignment: assignmentId,
      student: userId,
    });

    const totalScore = assignment.questions.length;
    const maxAttempts = Number(assignment.maxAttempts) || 0;
    const timerMinutes = Number(assignment.timer) || 0;

    if (!result) {
      return res.json({
        status: "not_started",
        totalScore,
        maxAttempts,
        timerMinutes,
      });
    }

    const attemptsUsed = result.attempts || 0;
    const canRetake =
      !result.isFinal &&
      assignment.allowRetake &&
      (maxAttempts === 0 || attemptsUsed < maxAttempts);

    const deadline =
      timerMinutes > 0 && result.startedAt
        ? new Date(
            new Date(result.startedAt).getTime() + timerMinutes * 60 * 1000,
          )
        : null;

    const inProgress = !!result.startedAt && !result.isFinal;

    return res.json({
      status: result.isFinal
        ? "completed"
        : inProgress
          ? "in_progress"
          : canRetake
            ? "can_retake"
            : "completed",
      score: result.score,
      totalScore,
      attemptsUsed,
      maxAttempts,
      timerMinutes,
      deadline,
      canRetake,
      isFinal: !!result.isFinal,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching assignment status");
    res.status(500).json({ error: "Failed to fetch assignment status" });
  }
};

// Kết quả chi tiết (BR-14: chỉ trả đáp án đúng khi đã chốt).
export const getStudentAssignmentResults = async (req, res) => {
  try {
    const { assignmentId, userId } = req.params;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }
    const totalScore = assignment.questions.length;

    const assignmentResult = await AssignmentResult.findOne({
      assignment: assignmentId,
      student: userId,
    });

    if (!assignmentResult) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy kết quả bài làm." });
    }

    const revealCorrect = !!assignmentResult.isFinal;

    const resultDetails = assignment.questions.map((question) => {
      const userAnswerObject = (assignmentResult.answers || []).find(
        (a) => a.questionId.toString() === question._id.toString(),
      );
      const userAnswer = userAnswerObject
        ? userAnswerObject.selectedOptions.userAnswer
        : [];
      const isCorrect = userAnswerObject
        ? userAnswerObject.selectedOptions.isCorrect
        : false;
      const base = {
        questionText: question.questionText,
        userAnswer: userAnswer.join(", "),
        isCorrect,
      };
      if (revealCorrect) {
        base.correctAnswer = question.options
          .filter((o) => o.isCorrect)
          .map((o) => o.text)
          .join(", ");
        base.explanation = question.explanation;
      }
      return base;
    });

    res.json({
      score: assignmentResult.score,
      answers: resultDetails,
      totalScore,
      isFinal: revealCorrect,
      attemptsUsed: assignmentResult.attempts || 0,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching quiz result");
    res.status(500).json({ message: "Lỗi server." });
  }
};

// Lấy danh sách khóa học đã đăng ký của học sinh
export const getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Tìm người dùng và populate enrolledCourses với thông tin khóa học
    const user = await User.findById(userId).populate({
      path: "enrolledCourses.courseId",
      select:
        "name slug image_url summary avgRating updatedAt totalStudentsEnrolled", // Chọn các trường cần thiết từ khóa học
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const enrolledCourses = user.enrolledCourses.map((enrollment) => {
      // Kiểm tra enrollment.courseId trước khi truy cập _doc
      if (enrollment.courseId) {
        return {
          ...enrollment.courseId._doc, // Lấy dữ liệu từ courseId
          progress: enrollment.progress, // Thêm tiến độ học tập vào kết quả
          lastAccessed: enrollment.lastAccessed, // Thêm thời gian truy cập gần nhất
        };
      } else {
        // Xử lý trường hợp enrollment.courseId là null
        return null;
      }
    });
    const validEnrolledCourses = enrolledCourses.filter(
      (course) => course !== null,
    );

    res.json(validEnrolledCourses);
  } catch (error) {
    logger.error({ err: error }, "Lỗi khi lấy danh sách khóa học đã đăng ký");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy danh sách khóa học yêu thích của học sinh
export const getFavoriteCourses = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).populate({
      path: "favoriteCourses",
      select: "name slug image_url", // Chọn các trường cần thiết từ khóa học
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.json(user.favoriteCourses);
  } catch (error) {
    logger.error({ err: error }, "Lỗi khi lấy danh sách khóa học yêu thích");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy danh sách khóa học được đề xuất cho học sinh (chưa có logic cụ thể)
export const getRecommendedCourses = async (req, res) => {
  try {
    const userId = req.params.userId;

    // **Logic đề xuất khóa học dựa trên userId (cần được triển khai)**
    // Ví dụ:
    // - Lấy danh sách khóa học thuộc chủ đề mà người dùng đã đăng ký
    // - Lấy danh sách khóa học phổ biến nhất
    // - Sử dụng thuật toán đề xuất (nếu có)

    // Giả sử bạn đã có logic và danh sách recommendedCourses
    const recommendedCourses = await Course.find({
      // ... (điều kiện tìm kiếm)
    }).select("name slug image_url");

    res.json(recommendedCourses);
  } catch (error) {
    logger.error({ err: error }, "Lỗi khi lấy danh sách khóa học đề xuất");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Thêm khóa học vào danh sách yêu thích
export const addCourseToFavorites = async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    // Tìm người dùng
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Kiểm tra xem khóa học đã có trong danh sách yêu thích chưa
    if (user.favoriteCourses.includes(courseId)) {
      return res
        .status(400)
        .json({ message: "Khóa học đã có trong danh sách yêu thích" });
    }

    // Thêm khóa học vào danh sách yêu thích
    user.favoriteCourses.push(courseId);
    await user.save();

    res.json({
      message: "Đã thêm khóa học vào danh sách yêu thích",
      favoriteCourses: user.favoriteCourses,
    });
  } catch (error) {
    logger.error({ err: error }, "Lỗi khi thêm khóa học vào danh sách yêu thích");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa khóa học khỏi danh sách yêu thích
export const removeCourseFromFavorites = async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    // Tìm người dùng
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Kiểm tra xem khóa học có trong danh sách yêu thích không
    if (!user.favoriteCourses.includes(courseId)) {
      return res
        .status(400)
        .json({ message: "Khóa học không có trong danh sách yêu thích" });
    }

    // Xóa khóa học khỏi danh sách yêu thích
    user.favoriteCourses = user.favoriteCourses.filter(
      (id) => id.toString() !== courseId,
    );
    await user.save();

    res.json({
      message: "Đã xóa khóa học khỏi danh sách yêu thích",
      favoriteCourses: user.favoriteCourses,
    });
  } catch (error) {
    logger.error({ err: error }, "Lỗi khi xóa khóa học khỏi danh sách yêu thích");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy danh sách học viên đã đăng ký khóa học
export const getEnrolledStudents = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Tìm danh sách enrollments của khóa học hiện tại
    const enrollments = await User.find(
      {
        "enrolledCourses.courseId": courseId,
      },
      {
        "enrolledCourses.$": 1, // Chỉ lấy enrollment có courseId trùng khớp
        username: 1,
        email: 1,
        thumbnail: 1,
      },
    ).lean(); // Trả về plain JavaScript object

    // Chuyển đổi dữ liệu để lấy progress từ enrollment và kiểm tra sự tồn tại của enrolledCourses
    const formattedStudents = enrollments.map((student) => ({
      _id: student._id,
      username: student.username,
      email: student.email,
      thumbnail: student.thumbnail,
      // Kiểm tra xem enrolledCourses có tồn tại không, và lấy progress nếu có
      progress:
        student.enrolledCourses && student.enrolledCourses[0]
          ? student.enrolledCourses[0].progress
          : 0,
    }));

    res.json(formattedStudents);
  } catch (error) {
    logger.error({ err: error }, "Lỗi khi lấy danh sách học viên đã đăng ký");
    res.status(500).json({ message: "Lỗi server" });
  }
};
