import crypto from "crypto";
import Order from "../models/Order.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

const VNPAY_VERSION = "2.1.0";
const VNPAY_COMMAND = "pay";
const VNPAY_ORDER_TYPE = "other";
const VNPAY_LOCALE = "vn";
const VNPAY_CURR_CODE = "VND";

const formatDate = (date = new Date()) => {
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
};

const encodeValue = (value) =>
  encodeURIComponent(String(value)).replace(/%20/g, "+");

const sortObjectByKey = (obj) =>
  Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = obj[key];
      return result;
    }, {});

const buildQueryString = (obj) =>
  Object.keys(obj)
    .map((key) => `${key}=${encodeValue(obj[key])}`)
    .join("&");

const buildSignature = (sortedParams, secretKey) =>
  crypto
    .createHmac("sha512", secretKey)
    .update(buildQueryString(sortedParams), "utf8")
    .digest("hex");

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded && typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || req.ip || "127.0.0.1";
};

const getFrontendBaseUrl = () =>
  (process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/$/, "");

const getBackendBaseUrl = () =>
  (process.env.BACKEND_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const mapResponseCodeToStatus = (responseCode) =>
  responseCode === "00" ? "success" : "fail";

const findOrderIdByTxnRef = async (txnRef) => {
  if (!txnRef) {
    return null;
  }

  const order = await Order.findOne({ paymentGatewayTxnRef: txnRef }).select(
    "_id",
  );

  return order?._id?.toString() || null;
};

const ensureEnrollment = async (order) => {
  const user = await User.findById(order.userId);
  const course = await Course.findById(order.courseId);

  if (!user || !course) {
    return;
  }

  const isEnrolled = user.enrolledCourses.some(
    (enrollment) => enrollment.courseId.toString() === course._id.toString(),
  );

  if (isEnrolled) {
    return;
  }

  user.enrolledCourses.push({ courseId: course._id });
  course.totalStudentsEnrolled += 1;

  await Promise.all([user.save(), course.save()]);
};

const processGatewayResult = async (req) => {
  const txnRef = req.query.vnp_TxnRef;
  const secureHash = req.query.vnp_SecureHash;
  if (!secureHash) {
    return {
      ok: false,
      rspCode: "97",
      message: "Missing secure hash",
      status: "fail",
      txnRef,
    };
  }

  const secretKey = process.env.VNPAY_HASH_SECRET;
  if (!secretKey) {
    return {
      ok: false,
      rspCode: "99",
      message: "Missing VNPAY_HASH_SECRET",
      status: "fail",
      txnRef,
    };
  }

  const rawParams = { ...req.query };
  delete rawParams.vnp_SecureHash;
  delete rawParams.vnp_SecureHashType;

  const sortedParams = sortObjectByKey(rawParams);
  const calculatedHash = buildSignature(sortedParams, secretKey);

  if (calculatedHash.toLowerCase() !== String(secureHash).toLowerCase()) {
    return {
      ok: false,
      rspCode: "97",
      message: "Invalid secure hash",
      status: "fail",
      txnRef,
    };
  }

  const order = await Order.findOne({ paymentGatewayTxnRef: txnRef });

  if (!order) {
    return {
      ok: false,
      rspCode: "01",
      message: "Order not found",
      status: "fail",
      txnRef,
    };
  }

  const expectedAmount = Math.round(Number(order.amount) * 100);
  const receivedAmount = Number(req.query.vnp_Amount || 0);
  if (expectedAmount !== receivedAmount) {
    return {
      ok: false,
      rspCode: "04",
      message: "Invalid amount",
      status: "fail",
      order,
      orderId: order._id.toString(),
      txnRef,
    };
  }

  // Idempotent callback handling for duplicate return/IPN hits.
  if (order.paymentStatus === "success") {
    return {
      ok: true,
      rspCode: "00",
      message: "Order already processed",
      status: "success",
      order,
      orderId: order._id.toString(),
      txnRef,
      transactionId: order.transactionId,
    };
  }

  const responseCode = String(req.query.vnp_ResponseCode || "99");
  const status = mapResponseCodeToStatus(responseCode);

  order.gatewayResponseCode = responseCode;
  order.paymentStatus = status;
  order.transactionId = String(req.query.vnp_TransactionNo || "");
  if (status === "success") {
    order.paidAt = new Date();
  } else {
    order.failedAt = new Date();
  }

  await order.save();

  if (status === "success") {
    await ensureEnrollment(order);
  }

  return {
    ok: true,
    rspCode: "00",
    message: "Confirmed",
    status,
    order,
    orderId: order._id.toString(),
    txnRef,
    transactionId: order.transactionId,
  };
};

export const createOrder = async (req, res) => {
  try {
    const { courseId, redirectUrl } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const course = await Course.findById(courseId).populate("teacher", "_id");
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    if (Number(course.price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "This endpoint is only for paid courses",
      });
    }

    const existingPendingOrder = await Order.findOne({
      userId,
      courseId,
      paymentStatus: "pending",
    });

    if (existingPendingOrder) {
      return res.status(200).json({
        success: true,
        orderId: existingPendingOrder._id,
        order: existingPendingOrder,
        message: "Existing pending order reused",
      });
    }

    const newOrder = new Order({
      userId,
      courseId,
      teacherId: course.teacher?._id || course.teacher,
      amount: Number(course.price),
      redirectUrl,
      courseName: course.name,
      paymentMethod: "vn-pay",
      paymentStatus: "pending",
    });
    await newOrder.save();

    res
      .status(201)
      .json({ success: true, orderId: newOrder._id, order: newOrder });
  } catch (error) {
    logger.error({ err: error }, "Error creating order");
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
      { transactionId, paymentStatus: "success", paidAt: new Date() }, // Legacy path
      { new: true },
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (error) {
    logger.error({ err: error }, "Error updating order");
    res.status(500).json({ message: "Error updating order" });
  }
};

export const createVnpayPaymentUrl = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const vnpUrl =
      process.env.VNPAY_URL ||
      "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    if (!tmnCode || !hashSecret) {
      return res.status(500).json({
        success: false,
        message: "Missing VNPAY_TMN_CODE or VNPAY_HASH_SECRET",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (String(order.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (order.paymentStatus === "success") {
      return res.status(400).json({
        success: false,
        message: "Order already paid",
      });
    }

    const amount = Math.round(Number(order.amount) * 100);
    const createDate = formatDate(new Date());
    const expireDate = formatDate(new Date(Date.now() + 15 * 60 * 1000));
    // Reuse txnRef nếu đã có để tránh mất giao dịch khi user bấm thanh toán lại.
    // Chỉ sinh mới khi order chưa từng khởi tạo URL thanh toán.
    const txnRef =
      order.paymentGatewayTxnRef ||
      `ORD${order._id.toString().slice(-8)}${Date.now()}`;
    const returnUrl = `${getBackendBaseUrl()}/api/orders/payment/vnpay-return`;

    if (!order.paymentGatewayTxnRef) {
      order.paymentGatewayTxnRef = txnRef;
    }
    order.paymentStatus = "pending";
    order.failedAt = undefined;
    await order.save();

    const params = {
      vnp_Version: VNPAY_VERSION,
      vnp_Command: VNPAY_COMMAND,
      vnp_TmnCode: tmnCode,
      vnp_Amount: amount,
      vnp_CreateDate: createDate,
      vnp_CurrCode: VNPAY_CURR_CODE,
      vnp_IpAddr: getClientIp(req),
      vnp_Locale: VNPAY_LOCALE,
      vnp_OrderInfo: `Thanh toan khoa hoc ${order.courseName}`,
      vnp_OrderType: VNPAY_ORDER_TYPE,
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: txnRef,
      vnp_ExpireDate: expireDate,
    };

    const sortedParams = sortObjectByKey(params);
    const signature = buildSignature(sortedParams, hashSecret);
    const paymentUrl = `${vnpUrl}?${buildQueryString({
      ...sortedParams,
      vnp_SecureHash: signature,
    })}`;

    return res.json({ success: true, paymentUrl, orderId: order._id });
  } catch (error) {
    logger.error({ err: error }, "Error creating VNPay URL");
    return res
      .status(500)
      .json({ success: false, message: "Failed to create VNPay URL" });
  }
};

export const handleVnpayIpn = async (req, res) => {
  try {
    const result = await processGatewayResult(req);
    return res.json({
      RspCode: result.rspCode,
      Message: result.message,
    });
  } catch (error) {
    logger.error({ err: error }, "Error handling VNPay IPN");
    return res.json({ RspCode: "99", Message: "Unknown error" });
  }
};

export const handleVnpayReturn = async (req, res) => {
  try {
    const result = await processGatewayResult(req);
    const frontendBaseUrl = getFrontendBaseUrl();
    const txnRef = result.txnRef || req.query.vnp_TxnRef || "";

    const redirectParams = new URLSearchParams({
      status: result.status || "fail",
      message: result.message || "Payment processed",
    });

    let orderId = result.orderId;
    if (!orderId && txnRef) {
      orderId = await findOrderIdByTxnRef(txnRef);
    }

    if (orderId) {
      redirectParams.set("orderId", orderId);
    }

    if (result.transactionId) {
      redirectParams.set("transactionId", result.transactionId);
    }

    if (txnRef) {
      redirectParams.set("txnRef", txnRef);
    }

    return res.redirect(
      `${frontendBaseUrl}/payment-redirect?${redirectParams.toString()}`,
    );
  } catch (error) {
    logger.error({ err: error }, "Error handling VNPay return");
    const frontendBaseUrl = getFrontendBaseUrl();
    return res.redirect(
      `${frontendBaseUrl}/payment-redirect?status=fail&message=${encodeURIComponent("Payment processing error")}`,
    );
  }
};

export const getOrderPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const order = await Order.findById(orderId).populate("courseId", "slug");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (String(order.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({
      success: true,
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      transactionId: order.transactionId,
      redirectUrl: order.redirectUrl,
      courseSlug: order.courseId?.slug,
      amount: order.amount,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching order payment status");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order payment status",
    });
  }
};

const parsePagination = (req, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || defaultLimit, 1),
    maxLimit,
  );
  return { page, limit, skip: (page - 1) * limit };
};

export const getOrders = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const [orders, total] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(),
    ]);
    res.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: `Error get all order: ${error.message}` });
  }
};

// LUỒNG 3: Student xem lịch sử đơn hàng của chính mình.
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { page, limit, skip } = parsePagination(req);

    // Filter theo status nếu query có.
    const filter = { userId };
    const allowedStatus = ["pending", "success", "fail"];
    if (req.query.status && allowedStatus.includes(req.query.status)) {
      filter.paymentStatus = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("courseId", "slug name image_url price"),
      Order.countDocuments(filter),
    ]);

    res.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching my orders");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy danh sách hóa đơn theo teacherId
export const getOrdersByTeacher = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const { page, limit, skip } = parsePagination(req);

    const [orders, total] = await Promise.all([
      Order.find({ teacherId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments({ teacherId }),
    ]);

    res.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Lỗi khi lấy danh sách hóa đơn theo teacherId");
    res.status(500).json({ message: "Lỗi server" });
  }
};
