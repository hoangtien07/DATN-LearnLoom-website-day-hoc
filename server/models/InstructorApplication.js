// Model đơn đăng ký làm giảng viên.
// Luồng: student nộp (pending) → admin duyệt (approved) hoặc từ chối (rejected).
import mongoose from "mongoose";

const { Schema } = mongoose;

const instructorApplicationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    expertise: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    motivation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    credentialsUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: { type: Date },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

// Mỗi user chỉ có 1 đơn đang xử lý tại 1 thời điểm.
instructorApplicationSchema.index(
  { user: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  },
);

const InstructorApplication = mongoose.model(
  "InstructorApplication",
  instructorApplicationSchema,
);

export default InstructorApplication;
