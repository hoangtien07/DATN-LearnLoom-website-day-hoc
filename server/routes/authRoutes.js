import express from "express";
import passport from "passport";
import { authLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

const getFrontendBaseUrl = () =>
  (process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/$/, "");

// Route đăng nhập với Google
router.get(
  "/google",
  authLimiter,
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

// Callback route sau khi xác thực với Google
router.get(
  "/google/callback",
  authLimiter,
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect(getFrontendBaseUrl());
  },
);

// Endpoint để lấy thông tin người dùng hiện tại
router.get("/current_user", (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(200).json(null);
  }

  return res.status(200).json(req.user);
});

// Đăng xuất
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect(getFrontendBaseUrl());
  });
});

export default router;
