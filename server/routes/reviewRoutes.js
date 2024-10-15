// server/routes/reviewRoutes.js
import express from "express";
import {
  createReview,
  updateReview,
  deleteReview,
  getReviews,
} from "../controllers/reviewController.js";

const router = express.Router();

router.get("/:courseId", getReviews);
router.post("/:courseId/:userId", createReview);
router.put("/:reviewId", updateReview);
router.delete("/:reviewId", deleteReview);

export default router;
