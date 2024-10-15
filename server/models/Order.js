import mongoose from "mongoose";

const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId, // Tham chiếu đến người dùng
      ref: "User",
      required: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId, // Tham chiếu đến người dùng
      ref: "User",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId, // Tham chiếu đến khóa học
      ref: "Course",
      required: true,
    },
    courseName: {
      type: String,
      required: true,
    },
    courseImage: {
      type: String,
    },
    redirectUrl: {
      type: String,
    },
    transactionId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      default: "vn-pay",
    },
    paymentStatus: {
      type: String,
      enum: ["success", "fail", "pending"],
      default: "success",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
