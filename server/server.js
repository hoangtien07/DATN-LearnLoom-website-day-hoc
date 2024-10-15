// server/server.js
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import "./config/passportConfig.js";
import connectDB from "./config/db.js";

import courseRoutes from "./routes/courseRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
// import teacherRoutes from "./routes/teacherRoutes.js";
// import adminRoutes from "./routes/adminRoutes.js";
import { isAuthenticated, checkRole } from "./middleware/isAuthenticated.js";

dotenv.config();

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

connectDB();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // Allow credentials (cookies, headers)
  })
);
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
// app.use("/api/student", studentRoutes);
// app.use("/api/teacher", teacherRoutes);
// app.use("/api/admin", adminRoutes);

// Start the server

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
