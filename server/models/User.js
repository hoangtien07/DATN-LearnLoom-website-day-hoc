import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    thumbnail: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["admin", "instructor", "student"],
      default: "student",
    },
    bio: String,
    phone: String,
    birthday: Date,
    facebookUrl: {
      type: String,
    },
    instaUrl: {
      type: String,
    },
    youtubeUrl: {
      type: String,
    },
    websiteUrl: {
      type: String,
    },
    enrolledCourses: [
      {
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
          required: true,
        },
        completedItems: [{ type: mongoose.Schema.Types.ObjectId }],
        progress: { type: Number, default: 0 },
        lastAccessed: { type: Date },
      },
    ],
    favoriteCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  },
  { timestamps: true } // Tạo các trường createdAt và updatedAt tự động
);

const User = mongoose.model("User", userSchema);
export default User;
