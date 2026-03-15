import express from "express";
import passport from "passport";
import { isAuthenticated } from "../middleware/isAuthenticated.js"; // Import the middleware

const router = express.Router();

// Route đăng nhập với Google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

// Callback route sau khi xác thực với Google
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect("http://localhost:5173"); // Redirect sau khi đăng nhập thành công
  },
);

// Endpoint để lấy thông tin người dùng hiện tại
router.get("/current_user", (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(200).json(null);
  }

  console.log("User information:", req.user);
  return res.status(200).json(req.user);
});

// Đăng xuất
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("http://localhost:5173"); // Đường dẫn khi đăng xuất
  });
});

export default router;
