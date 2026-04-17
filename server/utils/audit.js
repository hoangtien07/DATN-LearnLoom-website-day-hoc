// Audit log tối giản: hiện tại ghi qua logger, có thể chuyển sang collection riêng khi cần.
import logger from "./logger.js";

const sanitizeChanges = (changes) => {
  if (!changes || typeof changes !== "object") return changes;
  const redacted = { ...changes };
  for (const key of Object.keys(redacted)) {
    if (/password|secret|token|hash/i.test(key)) {
      redacted[key] = "[REDACTED]";
    }
  }
  return redacted;
};

export const recordAudit = ({
  actorId,
  actorRole,
  action,
  targetType,
  targetId,
  changes,
  metadata,
}) => {
  try {
    logger.info(
      {
        audit: true,
        actorId: actorId ? String(actorId) : null,
        actorRole: actorRole || null,
        action,
        targetType,
        targetId: targetId ? String(targetId) : null,
        changes: sanitizeChanges(changes),
        metadata: metadata || undefined,
      },
      `audit:${action}`,
    );
  } catch (err) {
    logger.error({ err }, "Failed to record audit entry");
  }
};

// Middleware tiện dụng: ghi audit sau khi response thành công cho admin/instructor action.
export const auditMiddleware = (action, resolveTarget) => (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    const target = typeof resolveTarget === "function" ? resolveTarget(req) : {};
    recordAudit({
      actorId: req.user?._id,
      actorRole: req.user?.role,
      action,
      targetType: target.targetType,
      targetId: target.targetId,
      metadata: target.metadata,
    });
  });
  next();
};
