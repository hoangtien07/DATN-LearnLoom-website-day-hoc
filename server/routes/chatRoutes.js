import express from "express";
import {
  clearChatHistory,
  deleteChatMessage,
  getChatHistory,
  streamChat,
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/history", getChatHistory);
router.delete("/history", clearChatHistory);
router.delete("/messages/:messageId", deleteChatMessage);
router.post("/stream", streamChat);

export default router;
