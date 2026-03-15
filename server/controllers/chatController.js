import mongoose from "mongoose";
import ChatMessage from "../models/ChatMessage.js";
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
    const scopeQuery = buildScopeQuery({
      userId,
      sessionKey: effectiveSessionKey,
      courseId,
      lessonId,
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
      courseId,
      lessonId,
      role: "user",
      content: message.trim(),
    });

    writeSSE(res, "ready", { messageId: String(userDoc._id) });

    let assistantText = "";
    const aiResult = await streamGeminiChat({
      message: message.trim(),
      history,
      context: { courseId, lessonId },
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
      courseId,
      lessonId,
      role: "assistant",
      content: assistantText,
      model: aiResult.model,
      finishReason: aiResult.finishReason,
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
