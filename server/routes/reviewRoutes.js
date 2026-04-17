// server/routes/reviewRoutes.js
import express from "express";
import {
  createReview,
  updateReview,
  deleteReview,
  getReviews,
} from "../controllers/reviewController.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
import { validateBody, rules } from "../utils/validate.js";
import { writeLimiter } from "../middleware/rateLimit.js";

const reviewSchema = {
  rating: rules.number({ min: 1, max: 5, integer: true }),
  comment: rules.string({ min: 1, max: 2000 }),
};

const router = express.Router();

router.get("/:courseId", getReviews);
router.post(
  "/:courseId/:userId",
  isAuthenticated,
  writeLimiter,
  validateBody(reviewSchema),
  createReview,
);
router.put(
  "/:reviewId",
  isAuthenticated,
  validateBody(reviewSchema),
  updateReview,
);
router.delete("/:reviewId", isAuthenticated, deleteReview);

export default router;
