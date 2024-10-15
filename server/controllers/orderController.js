import Order from "../models/Order.js";

export const createOrder = async (req, res) => {
  try {
    const { courseId, userId, teacherId, price, redirectUrl, courseName } =
      req.body;

    // 1. Create a new order in your database
    const newOrder = new Order({
      userId,
      courseId,
      teacherId,
      amount: price,
      redirectUrl,
      courseName,
    });
    await newOrder.save();

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error creating order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create order." });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const transactionId = req.params.transactionId;
    const userId = req.params.userId;
    const courseId = req.params.courseId;
    const updatedOrder = await Order.findOneAndUpdate(
      { userId, courseId }, // Tìm order
      { transactionId }, // Cập nhật trường transactionId (nếu cần)
      { new: true } // Trả về order đã được cập nhật
    );
    console.log(updatedOrder);

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Error updating order" });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: `Error get all order: ${error.message}` });
  }
};

// Lấy danh sách hóa đơn theo teacherId
export const getOrdersByTeacher = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;

    // Tìm danh sách hóa đơn dựa trên teacherId
    const orders = await Order.find({ teacherId });

    res.json(orders);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách hóa đơn theo teacherId:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
