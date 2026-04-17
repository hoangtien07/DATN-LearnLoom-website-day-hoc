import User from "../models/User.js";
import logger from "../utils/logger.js";
import { recordAudit } from "../utils/audit.js";

// Các field người dùng được tự cập nhật profile của mình.
const SELF_UPDATABLE_FIELDS = [
  "username",
  "thumbnail",
  "bio",
  "phone",
  "birthday",
  "facebookUrl",
  "instaUrl",
  "youtubeUrl",
  "websiteUrl",
];

// Admin có thể cập nhật thêm role; KHÔNG cho đụng googleId/email để tránh chiếm tài khoản.
// LƯU Ý: Luồng chuẩn để user trở thành instructor là qua InstructorApplication.
// Admin chỉ nên flip role trong các tình huống đặc biệt (fix lỗi, demote instructor vi phạm).
const ADMIN_UPDATABLE_FIELDS = [...SELF_UPDATABLE_FIELDS, "role"];

const VALID_ROLES = ["student", "instructor", "admin"];

const pickFields = (source, allowedFields) => {
  const picked = {};
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      picked[key] = source[key];
    }
  }
  return picked;
};

// Lấy danh sách người dùng (admin only)
export const getUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().skip(skip).limit(limit).select("-__v"),
      User.countDocuments(),
    ]);

    res.status(200).json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching users");
    res.status(500).json({ message: "Error fetching users" });
  }
};

// Cập nhật người dùng (admin hoặc chính chủ)
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const requester = req.user;

    if (!requester) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isSelf = String(requester._id) === String(userId);
    const isAdmin = requester.role === "admin";

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật người dùng này" });
    }

    const allowed = isAdmin ? ADMIN_UPDATABLE_FIELDS : SELF_UPDATABLE_FIELDS;
    const safeBody = pickFields(req.body, allowed);

    // Chặn admin tự leo quyền lên role không hợp lệ.
    // Chặn admin tự đổi role của chính mình (tránh khóa mọi admin).
    if ("role" in safeBody) {
      if (!VALID_ROLES.includes(safeBody.role)) {
        return res
          .status(400)
          .json({ message: `role phải là một trong: ${VALID_ROLES.join(", ")}` });
      }
      if (isSelf) {
        return res
          .status(400)
          .json({ message: "Không thể tự đổi role của chính mình" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, safeBody, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (isAdmin && !isSelf) {
      recordAudit({
        actorId: requester._id,
        actorRole: requester.role,
        action: "user.update",
        targetType: "User",
        targetId: userId,
        changes: safeBody,
      });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    logger.error({ err: error, userId: req.params.userId }, "Error updating user");
    res.status(500).json({ message: "Error updating user" });
  }
};

// Xóa người dùng (admin only - route đã check)
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const requester = req.user;

    if (String(requester._id) === String(userId)) {
      return res.status(400).json({ message: "Không thể tự xóa tài khoản admin đang đăng nhập" });
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    recordAudit({
      actorId: requester._id,
      actorRole: requester.role,
      action: "user.delete",
      targetType: "User",
      targetId: userId,
      changes: { email: deletedUser.email },
    });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error({ err: error, userId: req.params.userId }, "Error deleting user");
    res.status(500).json({ message: "Error deleting user" });
  }
};
