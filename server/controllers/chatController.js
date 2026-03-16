import mongoose from "mongoose";
import ChatMessage from "../models/ChatMessage.js";
import Course from "../models/Course.js";
import { Lesson } from "../models/Lesson.js";
import Assignment from "../models/Assignments.js";
import { streamGeminiChat } from "../services/geminiService.js";

const MAX_MESSAGE_LENGTH = Number(process.env.CHAT_MAX_MESSAGE_LENGTH || 4000);
const HISTORY_LIMIT = Number(process.env.CHAT_HISTORY_LIMIT || 20);

const writeSSE = (res, event, payload) => {
  if (res.writableEnded) {
    return;
  }

  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  if (typeof res.flush === "function") {
    res.flush();
  }
};

const parseOptionalId = (value, fieldName) => {
  if (!value) return null;

  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value;
};

const getErrorStatus = (error) =>
  /invalid|required/i.test(error.message) ? 400 : 500;

const parseSessionKey = (value) => {
  if (!value) return null;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const sanitizeShortText = (value, fallback = "") => {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : fallback;
};

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncateText = (value = "", maxLength = 1200) => {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
};

const normalizeItemType = (value) => {
  const normalized = sanitizeShortText(value).toLowerCase();
  if (normalized === "assignment") {
    return "assignment";
  }
  return "lesson";
};

const buildCurriculumSnapshot = (courseDoc, currentItemId) => {
  if (!courseDoc?.sections?.length) {
    return [];
  }

  return courseDoc.sections.slice(0, 6).map((section) => ({
    sectionName: sanitizeShortText(section?.name, "Chuong hoc"),
    items: (section?.items || []).slice(0, 8).map((item, index) => {
      const itemId = String(item?.itemId || "");
      const itemType = normalizeItemType(item?.itemType);
      const itemName = sanitizeShortText(
        item?.name,
        `${itemType} ${index + 1}`,
      );
      return {
        itemId,
        itemType,
        itemName,
        isCurrent: currentItemId ? itemId === String(currentItemId) : false,
      };
    }),
  }));
};

const resolveCourseAndItemContext = async ({
  courseId,
  lessonId,
  itemType,
  courseSlug,
}) => {
  let courseDoc = null;
  const normalizedItemType = normalizeItemType(itemType);

  if (courseId) {
    courseDoc = await Course.findById(courseId)
      .select("_id slug name summary description sections")
      .lean();
  } else if (courseSlug) {
    courseDoc = await Course.findOne({ slug: courseSlug })
      .select("_id slug name summary description sections")
      .lean();
  }

  let itemDoc = null;
  if (lessonId) {
    if (normalizedItemType === "assignment") {
      itemDoc = await Assignment.findById(lessonId)
        .select("_id name description questions")
        .lean();
    } else {
      itemDoc = await Lesson.findById(lessonId)
        .select("_id type name description content duration")
        .lean();
    }
  }

  const lessonExcerpt =
    normalizedItemType === "lesson"
      ? truncateText(
          stripHtml(itemDoc?.content || itemDoc?.description || ""),
          1800,
        )
      : "";

  const assignmentSummary =
    normalizedItemType === "assignment"
      ? {
          questionCount: Array.isArray(itemDoc?.questions)
            ? itemDoc.questions.length
            : 0,
          description: truncateText(
            sanitizeShortText(itemDoc?.description, ""),
            600,
          ),
        }
      : null;

  return {
    scope: {
      courseId: courseDoc?._id ? String(courseDoc._id) : courseId || null,
      lessonId: lessonId || null,
      itemType: normalizedItemType,
      courseSlug: courseDoc?.slug || courseSlug || null,
    },
    course: courseDoc
      ? {
          id: String(courseDoc._id),
          slug: courseDoc.slug || null,
          name: sanitizeShortText(courseDoc.name, "Khoa hoc hien tai"),
          summary: truncateText(
            sanitizeShortText(courseDoc.summary || courseDoc.description, ""),
            600,
          ),
        }
      : null,
    item: itemDoc
      ? {
          id: String(itemDoc._id),
          itemType: normalizedItemType,
          title: sanitizeShortText(
            itemDoc.name,
            normalizedItemType === "assignment"
              ? "Bai tap hien tai"
              : "Bai hoc hien tai",
          ),
          description: truncateText(
            sanitizeShortText(itemDoc.description, ""),
            600,
          ),
          lessonType:
            normalizedItemType === "lesson"
              ? sanitizeShortText(itemDoc.type, "Lesson")
              : null,
          duration:
            normalizedItemType === "lesson" && Number.isFinite(itemDoc.duration)
              ? itemDoc.duration
              : null,
          contentExcerpt: lessonExcerpt,
          assignmentSummary,
        }
      : null,
    curriculum: buildCurriculumSnapshot(courseDoc, lessonId),
  };
};

const buildScopeQuery = ({ userId, sessionKey, courseId, lessonId }) => {
  const query = {};

  if (userId) {
    query.userId = userId;
  } else {
    query.sessionKey = sessionKey;
  }

  if (courseId) {
    query.courseId = courseId;
  }

  if (lessonId) {
    query.lessonId = lessonId;
  }

  return query;
};

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || null;
    const sessionKey = parseSessionKey(req.query.sessionKey);

    if (!userId && !sessionKey) {
      return res
        .status(400)
        .json({ message: "sessionKey is required for guest history" });
    }

    const courseId = parseOptionalId(req.query.courseId, "courseId");
    const lessonId = parseOptionalId(req.query.lessonId, "lessonId");

    const scopeQuery = buildScopeQuery({
      userId,
      sessionKey,
      courseId,
      lessonId,
    });

    const messages = await ChatMessage.find(scopeQuery)
      .sort({ createdAt: 1 })
      .limit(Number(req.query.limit || 100));

    return res.status(200).json({
      status: "success",
      messages,
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ message: error.message });
  }
};

export const clearChatHistory = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || null;
    const sessionKey = parseSessionKey(
      req.body.sessionKey || req.query.sessionKey,
    );

    if (!userId && !sessionKey) {
      return res
        .status(400)
        .json({ message: "sessionKey is required for guest history" });
    }

    const courseId = parseOptionalId(
      req.body.courseId || req.query.courseId,
      "courseId",
    );
    const lessonId = parseOptionalId(
      req.body.lessonId || req.query.lessonId,
      "lessonId",
    );

    const scopeQuery = buildScopeQuery({
      userId,
      sessionKey,
      courseId,
      lessonId,
    });

    const result = await ChatMessage.deleteMany(scopeQuery);

    return res.status(200).json({
      status: "success",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ message: error.message });
  }
};

export const deleteChatMessage = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || null;
    const sessionKey = parseSessionKey(
      req.body.sessionKey || req.query.sessionKey,
    );
    const messageId = req.params.messageId;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "messageId is invalid" });
    }

    if (!userId && !sessionKey) {
      return res
        .status(400)
        .json({ message: "sessionKey is required for guest history" });
    }

    const deleteQuery = {
      _id: messageId,
      ...(userId ? { userId } : { sessionKey }),
    };

    const deletedMessage = await ChatMessage.findOneAndDelete(deleteQuery);

    if (!deletedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.status(200).json({
      status: "success",
      messageId,
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ message: error.message });
  }
};

export const streamChat = async (req, res) => {
  const userId = req.user?._id || req.user?.id || null;
  const message = req.body.message;
  const sessionKey = parseSessionKey(req.body.sessionKey);
  const itemType = normalizeItemType(req.body.itemType);
  const courseSlug = sanitizeShortText(req.body.courseSlug, "") || null;

  let courseId;
  let lessonId;

  try {
    courseId = parseOptionalId(req.body.courseId, "courseId");
    lessonId = parseOptionalId(req.body.lessonId, "lessonId");
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ message: "message is required" });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      message: `message exceeds max length of ${MAX_MESSAGE_LENGTH}`,
    });
  }

  if (!userId && !sessionKey) {
    return res
      .status(400)
      .json({ message: "sessionKey is required for guest chat" });
  }

  const effectiveSessionKey = userId ? null : sessionKey;

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  let streamClosed = false;
  req.on("aborted", () => {
    streamClosed = true;
  });
  res.on("close", () => {
    streamClosed = true;
  });

  try {
    const resolvedContext = await resolveCourseAndItemContext({
      courseId,
      lessonId,
      itemType,
      courseSlug,
    });

    const scopeQuery = buildScopeQuery({
      userId,
      sessionKey: effectiveSessionKey,
      courseId: resolvedContext.scope.courseId,
      lessonId: resolvedContext.scope.lessonId,
    });

    const historyMessages = await ChatMessage.find(scopeQuery)
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .lean();

    const history = historyMessages.reverse().map((item) => ({
      role: item.role,
      content: item.content,
    }));

    const userDoc = await ChatMessage.create({
      sessionKey: effectiveSessionKey,
      userId,
      courseId: resolvedContext.scope.courseId,
      lessonId: resolvedContext.scope.lessonId,
      role: "user",
      content: message.trim(),
      contextMeta: {
        itemType: resolvedContext.scope.itemType,
        courseSlug: resolvedContext.scope.courseSlug,
        itemTitle: resolvedContext.item?.title || null,
      },
    });

    writeSSE(res, "ready", { messageId: String(userDoc._id) });

    let assistantText = "";
    const aiResult = await streamGeminiChat({
      message: message.trim(),
      history,
      context: resolvedContext,
      onChunk: (text) => {
        assistantText += text;
        if (!streamClosed) {
          writeSSE(res, "chunk", { text });
        }
      },
    });

    const assistantDoc = await ChatMessage.create({
      sessionKey: effectiveSessionKey,
      userId,
      courseId: resolvedContext.scope.courseId,
      lessonId: resolvedContext.scope.lessonId,
      role: "assistant",
      content: assistantText,
      model: aiResult.model,
      finishReason: aiResult.finishReason,
      contextMeta: {
        itemType: resolvedContext.scope.itemType,
        courseSlug: resolvedContext.scope.courseSlug,
        itemTitle: resolvedContext.item?.title || null,
      },
    });

    if (!streamClosed) {
      writeSSE(res, "done", {
        messageId: String(assistantDoc._id),
        text: assistantText,
        model: aiResult.model,
        finishReason: aiResult.finishReason,
      });
      res.end();
    }
  } catch (error) {
    if (!streamClosed) {
      writeSSE(res, "error", { message: error.message || "Chat failed" });
      res.end();
    }
  }
};
