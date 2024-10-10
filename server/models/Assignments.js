import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    name: { type: String, required: true },
    type: { type: String, enum: ["question", "assignment"], required: true },
    content: String, // for assignments
    questions: [
      {
        question: String,
        questionType: {
          type: String,
          enum: ["single", "multiple", "true-false"],
          required: true,
        },
        options: [{ type: String }],
        correctAnswer: String,
        explanation: String,
      },
    ],
  },
  { timestamps: true }
);

const Assignment = mongoose.model("Assignment", assignmentSchema);
export default Assignment;
