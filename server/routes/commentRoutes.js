// server/routes/commentRoutes.js
import express from "express";
import {
  getComments,
  addComment,
  updateComment,
  deleteComment,
} from "../controllers/commentController.js";

const router = express.Router();

router.get("/:itemType/:itemId", getComments);
router.post("/:itemType/:itemId/:userId", addComment);
router.put("/:commentId", updateComment);
router.delete("/:commentId", deleteComment);

export default router;
