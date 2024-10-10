// server/models/Course.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    overviewVideo: { type: String },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    totalLessons: { type: Number },
    totalDuration: { type: String },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    // totalStudentsEnrolled: {
    //   type: Number,
    //   default: 0,
    // },
    visible: {
      type: Boolean,
      default: true,
    },
    image_url: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
      required: true,
    },
    old_price: {
      type: Number,
      default: 0,
    },
    is_pro: {
      type: Boolean,
      default: false,
      required: true,
    },
    is_published: {
      type: Boolean,
      required: true,
    },
    is_selling: {
      type: Boolean,
      default: false,
      required: true,
    },
    published_at: {
      type: Date,
      required: true,
    },
    chapters: [
      {
        name: { type: String, required: true },
        lessons: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
        quizzes: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],
        assignments: [{ type: Schema.Types.ObjectId, ref: "Assignment" }],
      },
    ],
    reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;
