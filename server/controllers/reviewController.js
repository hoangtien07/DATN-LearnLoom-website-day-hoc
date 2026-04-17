// server/controllers/reviewController.js
import Review from "../models/Review.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

// BR-10: ngưỡng tiến độ tối thiểu để cho phép học viên viết review.
const MIN_PROGRESS_FOR_REVIEW = Number(
  process.env.REVIEW_MIN_PROGRESS_PERCENT || 50,
);

// Lấy danh sách đánh giá cho khóa học
export const getReviews = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ courseId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username"),
      Review.countDocuments({ courseId }),
    ]);

    res.status(200).json({
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching reviews");
    res.status(500).json({ message: "Error fetching reviews" });
  }
};

// Tạo đánh giá mới (BR-10 + BR-11).
// - Bắt buộc enrolled và progress ≥ MIN_PROGRESS_FOR_REVIEW.
// - Nếu đã có review (userId, courseId) → trả 409 kèm existingReviewId để FE chuyển sang update.
export const createReview = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.params.userId;
    const { rating, comment } = req.validatedBody || req.body;

    if (String(req.user?._id) !== String(userId)) {
      return res
        .status(403)
        .json({ message: "Không thể đánh giá thay người khác" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const enrollment = user.enrolledCourses?.find(
      (e) => String(e.courseId) === String(courseId),
    );
    if (!enrollment) {
      return res
        .status(403)
        .json({ code: "NOT_ENROLLED", message: "Bạn chưa tham gia khóa học này" });
    }

    const progress = Number(enrollment.progress) || 0;
    if (progress < MIN_PROGRESS_FOR_REVIEW) {
      return res.status(403).json({
        code: "PROGRESS_INSUFFICIENT",
        message: `Cần hoàn thành tối thiểu ${MIN_PROGRESS_FOR_REVIEW}% khóa học để viết đánh giá`,
        currentProgress: progress,
        minProgress: MIN_PROGRESS_FOR_REVIEW,
      });
    }

    const existing = await Review.findOne({ userId, courseId }).select("_id");
    if (existing) {
      return res.status(409).json({
        code: "REVIEW_ALREADY_EXISTS",
        message: "Bạn đã đánh giá khóa học này. Hãy dùng chức năng cập nhật.",
        existingReviewId: existing._id,
      });
    }

    const newReview = new Review({
      courseId,
      userId,
      userName: user.username,
      thumbnail: user.thumbnail,
      rating,
      comment,
    });

    await newReview.save();
    await updateCourseAvgRating(courseId);

    res.status(201).json(newReview);
  } catch (error) {
    // Race condition: 2 request song song cùng tạo review → E11000 do unique index.
    if (error?.code === 11000) {
      return res.status(409).json({
        code: "REVIEW_ALREADY_EXISTS",
        message: "Bạn đã đánh giá khóa học này.",
      });
    }
    logger.error({ err: error }, "Error creating review");
    res.status(500).json({ message: "Error creating review" });
  }
};

// Cập nhật đánh giá (chỉ owner hoặc admin)
export const updateReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const { rating, comment } = req.validatedBody || req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const isOwner = String(review.userId) === String(req.user?._id);
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Không có quyền chỉnh sửa đánh giá này" });
    }

    review.rating = rating;
    review.comment = comment;
    await review.save();
    await updateCourseAvgRating(review.courseId);

    res.json(review);
  } catch (error) {
    logger.error({ err: error }, "Error updating review");
    res.status(500).json({ message: "Error updating review" });
  }
};

// Hàm cập nhật avgRating cho khóa học
const updateCourseAvgRating = async (courseId) => {
  const reviews = await Review.find({ courseId });
  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  await Course.findByIdAndUpdate(courseId, { avgRating });
};

// Xóa đánh giá (owner hoặc admin)
export const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const isOwner = String(review.userId) === String(req.user?._id);
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Không có quyền xóa đánh giá này" });
    }

    await review.deleteOne();
    await updateCourseAvgRating(review.courseId);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    logger.error({ err: error }, "Error deleting review");
    res.status(500).json({ message: "Error deleting review" });
  }
};
