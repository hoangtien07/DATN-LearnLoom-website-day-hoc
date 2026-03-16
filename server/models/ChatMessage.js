import mongoose from "mongoose";

const { Schema } = mongoose;

const chatMessageSchema = new Schema(
  {
    sessionKey: {
      type: String,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      default: null,
    },
    finishReason: {
      type: String,
      default: null,
    },
    contextMeta: {
      itemType: {
        type: String,
        enum: ["lesson", "assignment", null],
        default: null,
      },
      courseSlug: {
        type: String,
        default: null,
      },
      itemTitle: {
        type: String,
        default: null,
      },
    },
  },
  { timestamps: true },
);

chatMessageSchema.index({ userId: 1, courseId: 1, lessonId: 1, createdAt: -1 });
chatMessageSchema.index({
  sessionKey: 1,
  courseId: 1,
  lessonId: 1,
  createdAt: -1,
});

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;
