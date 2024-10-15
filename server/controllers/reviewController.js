// server/controllers/reviewController.js
import Review from "../models/Review.js";
import Course from "../models/Course.js";
import User from "../models/User.js";

// Lấy danh sách đánh giá cho khóa học
export const getReviews = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const reviews = await Review.find({ courseId }).populate(
      "author",
      "username"
    );
    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Error fetching reviews" });
  }
};

// Tạo đánh giá mới
export const createReview = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.params.userId;
    const { rating, comment } = req.body;

    console.log(courseId, userId, rating, comment);

    // Kiểm tra xem khóa học có tồn tại
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Kiểm tra xem người dùng có tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Tạo đánh giá mới
    const newReview = new Review({
      courseId,
      userId,
      userName: user.username,
      thumbnail: user.thumbnail,
      rating,
      comment,
    });

    await newReview.save();

    // Cập nhật avgRating cho khóa học
    await updateCourseAvgRating(courseId);

    res.status(201).json(newReview);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ message: "Error creating review" });
  }
};

// Cập nhật đánh giá
export const updateReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const { rating, comment } = req.body;

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { rating, comment },
      { new: true }
    );

    if (!updatedReview) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Cập nhật avgRating cho khóa học
    await updateCourseAvgRating(updatedReview.courseId);

    res.json(updatedReview);
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ message: "Error updating review" });
  }
};

// Hàm cập nhật avgRating cho khóa học
const updateCourseAvgRating = async (courseId) => {
  const reviews = await Review.find({ courseId });
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const avgRating = totalRating / reviews.length;

  await Course.findByIdAndUpdate(courseId, { avgRating });
};

// Xóa đánh giá
export const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;

    const deletedReview = await Review.findByIdAndDelete(reviewId);

    if (!deletedReview) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ message: "Error deleting review" });
  }
};
