// Quiz Assignment
import mongoose from "mongoose";
const { Schema } = mongoose;

const assignmentSchema = new mongoose.Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    name: { type: String, required: true },
    description: { type: String },
    questions: [
      {
        questionText: { type: String },
        options: [{ text: String, isCorrect: Boolean }],
        explanation: { type: String },
      },
    ],
    timer: { type: Number, default: null }, // phút; null = không giới hạn thời gian
    allowRetake: { type: Boolean, default: false },
    // BR-12: giới hạn số lần làm lại. null/0 = không giới hạn (chỉ có ý nghĩa khi allowRetake=true).
    maxAttempts: { type: Number, default: 3 },
  },
  { timestamps: true }
);

const Assignment = mongoose.model("Assignment", assignmentSchema);
export default Assignment;

const assignmentResultSchema = new Schema({
  assignment: {
    type: Schema.Types.ObjectId,
    ref: "Assignment",
    required: true,
  },
  student: { type: Schema.Types.ObjectId, ref: "User", required: true },
  answers: [
    {
      questionId: { type: Schema.Types.ObjectId, required: true },
      selectedOptions: {
        userAnswer: [{ type: String }],
        isCorrect: { type: Boolean, default: false },
      },
      explanation: { type: String },
    },
  ],
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  // BR-12: thời điểm bắt đầu làm bài — dùng để enforce timer server-side.
  startedAt: { type: Date },
  submittedAt: { type: Date, default: Date.now },
  // BR-12: đếm số lần đã nộp, so với assignment.maxAttempts.
  attempts: { type: Number, default: 0 },
  // Cho biết học sinh đã hoàn tất (không còn được làm lại) để BE trả đáp án đúng.
  isFinal: { type: Boolean, default: false },
});

// 1 học sinh chỉ có 1 document kết quả cho 1 assignment (các lần làm lại tích luỹ vào attempts).
assignmentResultSchema.index({ assignment: 1, student: 1 }, { unique: true });

const AssignmentResult = mongoose.model(
  "AssignmentResult",
  assignmentResultSchema
);
export { AssignmentResult };
