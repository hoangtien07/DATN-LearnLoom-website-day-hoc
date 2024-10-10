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
      enum: ["admin", "teacher", "student"],
      default: "student",
    },
    bio: String,
    enrolledCourses: [
      {
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
        },
        lessonsCompleted: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lesson",
          },
        ],
        progressPercentage: { type: Number },
        lastAccessed: { type: Date },
      },
    ],
  },
  { timestamps: true } // Tạo các trường createdAt và updatedAt tự động
);

const User = mongoose.model("User", userSchema);
export default User;
