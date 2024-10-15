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
    timer: { type: Number, default: null },
    allowRetake: { type: Boolean, default: false },
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
  submittedAt: { type: Date, default: Date.now },
});

const AssignmentResult = mongoose.model(
  "AssignmentResult",
  assignmentResultSchema
);
export { AssignmentResult };
