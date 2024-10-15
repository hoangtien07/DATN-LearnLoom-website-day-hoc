import mongoose from "mongoose";

const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId, // Tham chiếu đến người dùng
      ref: "User",
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId, // Tham chiếu đến khóa học
      ref: "Course",
      required: true,
    },
    // Một trong hai: hoặc là lesson hoặc là assignment
    lesson: {
      type: Schema.Types.ObjectId, // Tham chiếu đến bài học nếu comment trong bài học
      ref: "Lesson",
    },
    assignment: {
      type: Schema.Types.ObjectId, // Tham chiếu đến bài tập nếu comment trong bài tập
      ref: "Assignment",
    },
    replies: [
      {
        type: Schema.Types.ObjectId, // Tham chiếu đến các comment khác nếu là phản hồi
        ref: "Comment",
      },
    ],
    likes: [
      {
        type: Schema.Types.ObjectId, // Tham chiếu đến người dùng đã like comment này
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
