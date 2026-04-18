// server/server.js
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import "./config/passportConfig.js";
import connectDB from "./config/db.js";
import logger from "./utils/logger.js";

import courseRoutes from "./routes/courseRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import instructorApplicationRoutes from "./routes/instructorApplicationRoutes.js";
// import adminRoutes from "./routes/adminRoutes.js";
import { isAuthenticated, checkRole } from "./middleware/isAuthenticated.js";

dotenv.config();

if (!process.env.SESSION_SECRET) {
  logger.error(
    "SESSION_SECRET không được thiết lập. Server sẽ không khởi động để tránh lộ lỗ hổng bảo mật.",
  );
  process.exit(1);
}

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const envAllowedOrigins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = envAllowedOrigins.length
  ? envAllowedOrigins
  : defaultAllowedOrigins;

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without origin (same-origin/proxy, curl, server-to-server).
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: 200,
};

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);

// Chờ DB connect xong mới mount routes + listen — tránh Mongoose
// buffering timeout khi request đến lúc connection chưa sẵn sàng.
await connectDB();
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

// Mount routes

app.use("/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/instructor-applications", instructorApplicationRoutes);
// app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
// app.use("/api/admin", adminRoutes);

// Start the server

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server running");
});
