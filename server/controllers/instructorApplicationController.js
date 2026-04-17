import InstructorApplication from "../models/InstructorApplication.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { recordAudit } from "../utils/audit.js";

// Student nộp đơn xin làm giảng viên.
export const submitApplication = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "instructor" || user.role === "admin") {
      return res.status(400).json({
        code: "ALREADY_PRIVILEGED",
        message: "Bạn đã có quyền giảng viên hoặc admin",
      });
    }

    const { fullName, phone, expertise, motivation, credentialsUrl } =
      req.validatedBody || req.body;

    const existing = await InstructorApplication.findOne({
      user: userId,
      status: "pending",
    });
    if (existing) {
      return res.status(409).json({
        code: "APPLICATION_PENDING",
        message: "Bạn đang có đơn đăng ký chờ duyệt",
        applicationId: existing._id,
      });
    }

    const application = await InstructorApplication.create({
      user: userId,
      fullName,
      phone,
      expertise,
      motivation,
      credentialsUrl,
    });

    res.status(201).json(application);
  } catch (error) {
    logger.error({ err: error }, "Error submitting instructor application");
    res.status(500).json({ message: "Không tạo được đơn đăng ký" });
  }
};

// User xem các đơn của chính mình.
export const getMyApplications = async (req, res) => {
  try {
    const applications = await InstructorApplication.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    logger.error({ err: error }, "Error fetching my applications");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Admin xem danh sách đơn (có filter status + pagination).
export const listApplications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && ["pending", "approved", "rejected"].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [applications, total] = await Promise.all([
      InstructorApplication.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username email thumbnail")
        .populate("reviewedBy", "username email"),
      InstructorApplication.countDocuments(filter),
    ]);

    res.json({
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error listing applications");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Admin duyệt đơn → promote user.role = instructor.
export const approveApplication = async (req, res) => {
  try {
    const application = await InstructorApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    if (application.status !== "pending") {
      return res.status(409).json({
        code: "APPLICATION_ALREADY_PROCESSED",
        message: "Đơn đã được xử lý",
      });
    }

    const user = await User.findById(application.user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = "instructor";
    application.status = "approved";
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();

    await Promise.all([user.save(), application.save()]);

    recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "instructor_application.approve",
      targetType: "InstructorApplication",
      targetId: application._id,
      metadata: { userId: String(user._id), newRole: "instructor" },
    });

    res.json({ message: "Đã duyệt đơn", application });
  } catch (error) {
    logger.error({ err: error }, "Error approving application");
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Admin từ chối đơn (kèm lý do).
export const rejectApplication = async (req, res) => {
  try {
    const { rejectionReason } = req.validatedBody || req.body;

    const application = await InstructorApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    if (application.status !== "pending") {
      return res.status(409).json({
        code: "APPLICATION_ALREADY_PROCESSED",
        message: "Đơn đã được xử lý",
      });
    }

    application.status = "rejected";
    application.rejectionReason = rejectionReason;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();

    recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "instructor_application.reject",
      targetType: "InstructorApplication",
      targetId: application._id,
      metadata: { userId: String(application.user) },
    });

    res.json({ message: "Đã từ chối đơn", application });
  } catch (error) {
    logger.error({ err: error }, "Error rejecting application");
    res.status(500).json({ message: "Lỗi server" });
  }
};
