// Rate limit in-memory đơn giản (sliding window). Dùng cho single-instance.
// Khi scale nhiều instance, thay bằng Redis-backed limiter.
import logger from "../utils/logger.js";

const buckets = new Map();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60_000);
cleanupInterval.unref?.();

const getClientKey = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown";
  const userId = req.user?._id ? String(req.user._id) : "anon";
  return `${ip}:${userId}`;
};

/**
 * Tạo middleware rate limit.
 * @param {object} options
 * @param {number} options.windowMs  - kích thước cửa sổ (ms)
 * @param {number} options.max       - số request tối đa trong cửa sổ
 * @param {string} options.bucket    - tên bucket (để cô lập các limiter)
 * @param {string} [options.message] - message trả về khi vượt giới hạn
 */
export const createRateLimiter = ({
  windowMs,
  max,
  bucket,
  message = "Quá nhiều yêu cầu, vui lòng thử lại sau.",
}) => {
  if (!windowMs || !max || !bucket) {
    throw new Error("createRateLimiter: windowMs, max, bucket là bắt buộc");
  }

  return (req, res, next) => {
    const key = `${bucket}:${getClientKey(req)}`;
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfter));
      logger.warn(
        { bucket, key, count: entry.count, retryAfter },
        "Rate limit exceeded",
      );
      return res.status(429).json({
        message,
        retryAfter,
      });
    }
    next();
  };
};

// Preset cho các luồng nhạy cảm.
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  bucket: "auth",
  message: "Quá nhiều lần đăng nhập, vui lòng thử lại sau 15 phút.",
});

export const chatLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  bucket: "chat",
  message: "Bạn đang nhắn quá nhanh, vui lòng chậm lại.",
});

export const paymentLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  bucket: "payment",
  message: "Quá nhiều yêu cầu thanh toán, vui lòng thử lại sau.",
});

export const writeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  bucket: "write",
});
