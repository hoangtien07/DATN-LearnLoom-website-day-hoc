// server/models/Course.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const itemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ["lesson", "assignment"],
    required: true,
  },
  itemId: {
    type: Schema.Types.ObjectId,
    refPath: "itemType", // Use "itemType" for dynamic referencing
    required: true,
  },
  order: { type: Number, default: 0 },
});

const sectionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true },
  items: [itemSchema],
});

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    summary: { type: String, required: true },
    description: { type: String },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    overviewVideo: { type: String },
    level: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    totalLessons: { type: Number },
    totalDuration: { type: Number },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    totalStudentsEnrolled: {
      type: Number,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
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
    is_published: {
      type: Boolean,
      required: true,
    },
    is_selling: {
      type: Boolean,
      default: false,
    },
    published_at: {
      type: Date,
    },
    sections: [sectionSchema],
    reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
  },
  { timestamps: true }
);
// Create indexes after the schema definition
// courseSchema.post("init", function () {
//   this.createIndexes([{ key: { slug: 1 }, unique: true }]);
// });
const Course = mongoose.model("Course", courseSchema);
export default Course;
