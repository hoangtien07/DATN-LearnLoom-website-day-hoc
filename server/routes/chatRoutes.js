import express from "express";
import {
  clearChatHistory,
  deleteChatMessage,
  getChatHistory,
  streamChat,
} from "../controllers/chatController.js";
import { chatLimiter } from "../middleware/rateLimit.js";
import { chatQuotaForGuest } from "../middleware/chatQuota.js";

const router = express.Router();

// Chat cho phép guest (xác thực qua sessionKey trong controller).
// Rate limit burst (chatLimiter) + quota 24h cho guest (chatQuotaForGuest).
router.get("/history", getChatHistory);
router.delete("/history", clearChatHistory);
router.delete("/messages/:messageId", deleteChatMessage);
router.post("/stream", chatLimiter, chatQuotaForGuest, streamChat);

export default router;
