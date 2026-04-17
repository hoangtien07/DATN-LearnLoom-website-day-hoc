import express from "express";
import {
  submitApplication,
  getMyApplications,
  listApplications,
  approveApplication,
  rejectApplication,
} from "../controllers/instructorApplicationController.js";
import {
  isAuthenticated,
  checkRole,
} from "../middleware/isAuthenticated.js";
import { validateBody, rules } from "../utils/validate.js";
import { writeLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

const submitSchema = {
  fullName: rules.string({ min: 2, max: 200 }),
  phone: rules.string({ max: 30, optional: true }),
  expertise: rules.string({ min: 2, max: 200 }),
  motivation: rules.string({ min: 20, max: 2000 }),
  credentialsUrl: rules.string({
    max: 500,
    optional: true,
    pattern: /^https?:\/\//i,
  }),
};

const rejectSchema = {
  rejectionReason: rules.string({ min: 5, max: 1000 }),
};

// User endpoints
router.post(
  "/",
  isAuthenticated,
  writeLimiter,
  validateBody(submitSchema),
  submitApplication,
);
router.get("/mine", isAuthenticated, getMyApplications);

// Admin endpoints
router.get("/", isAuthenticated, checkRole("admin"), listApplications);
router.put(
  "/:id/approve",
  isAuthenticated,
  checkRole("admin"),
  approveApplication,
);
router.put(
  "/:id/reject",
  isAuthenticated,
  checkRole("admin"),
  validateBody(rejectSchema),
  rejectApplication,
);

export default router;
