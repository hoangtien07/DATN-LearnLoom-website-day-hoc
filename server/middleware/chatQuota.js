// BR-17: Guest (chưa đăng nhập) chỉ được gửi GUEST_CHAT_DAILY_QUOTA tin nhắn / sessionKey / 24h.
// Đếm số message role="user" trong ChatMessage collection → persistent, survive restart.
import ChatMessage from "../models/ChatMessage.js";
import logger from "../utils/logger.js";

const GUEST_DAILY_QUOTA = Number(process.env.GUEST_CHAT_DAILY_QUOTA || 5);

export const chatQuotaForGuest = async (req, res, next) => {
  try {
    // User đã đăng nhập → bỏ qua quota này (đã có `chatLimiter` tổng).
    if (req.isAuthenticated?.() && req.user?._id) {
      return next();
    }

    const sessionKey = String(req.body?.sessionKey || "").trim();
    if (!sessionKey) {
      return res.status(400).json({
        message: "sessionKey là bắt buộc cho guest",
      });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const usedToday = await ChatMessage.countDocuments({
      sessionKey,
      userId: { $exists: false },
      role: "user",
      createdAt: { $gte: since },
    });

    if (usedToday >= GUEST_DAILY_QUOTA) {
      return res.status(429).json({
        code: "GUEST_QUOTA_EXCEEDED",
        message: `Khách chỉ được gửi tối đa ${GUEST_DAILY_QUOTA} tin nhắn AI / ngày. Hãy đăng nhập để tiếp tục.`,
        quota: GUEST_DAILY_QUOTA,
        used: usedToday,
      });
    }

    // Gắn vào req để controller biết (nếu cần).
    req.guestChatUsed = usedToday;
    return next();
  } catch (err) {
    logger.error({ err }, "chatQuotaForGuest error");
    // Fail-open: không chặn user vì lỗi hạ tầng; middleware rateLimit tổng vẫn còn.
    return next();
  }
};
