import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Người đánh giá
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true }, // khóa học được đánh giá
    rating: { type: Number, min: 1, max: 5, required: true }, // Đánh giá từ 1 đến 5 sao
    comment: { type: String, required: true },
    completedPercentage: { type: Number, min: 0, max: 100, required: true }, // Tỉ lệ hoàn thành khóa học
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
