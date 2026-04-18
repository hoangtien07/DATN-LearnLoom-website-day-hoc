// server/config/db.js
import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectDB = async () => {
  const uri = (process.env.MONGO_URI || "").trim();
  if (!uri) {
    logger.error(
      "MONGO_URI không được thiết lập trong .env — server không thể khởi động.",
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      // Fail fast (5s) thay vì default 30s → dev nhận lỗi sớm.
      serverSelectionTimeoutMS: 5000,
      // Tắt buffer operation: query khi chưa connect → throw ngay,
      // không đợi 10s timeout mập mờ.
      bufferCommands: false,
    });
    logger.info({ host: mongoose.connection.host }, "MongoDB connected");
  } catch (error) {
    // Tách thông báo rõ ràng + hint theo dạng lỗi thường gặp.
    const hints = [];
    const msg = (error?.message || "").toLowerCase();

    if (msg.includes("econnrefused")) {
      hints.push("• MongoDB local chưa chạy. Khởi động service:");
      hints.push('    Windows: net start MongoDB (hoặc mở MongoDB Compass)');
      hints.push("    macOS: brew services start mongodb-community");
      hints.push("    Linux: sudo systemctl start mongod");
    }
    if (msg.includes("authentication failed") || msg.includes("auth failed")) {
      hints.push("• Sai username/password trong MONGO_URI (check Atlas).");
    }
    if (msg.includes("ip") || msg.includes("whitelist")) {
      hints.push(
        "• IP chưa được whitelist ở Atlas — vào Network Access → Add IP.",
      );
    }
    if (msg.includes("timeout") || msg.includes("server selection")) {
      hints.push(
        "• Không thấy MongoDB ở URI đã cấu hình. Kiểm tra:",
      );
      hints.push(`    MONGO_URI hiện tại = ${uri.replace(/:[^:@/]+@/, ":***@")}`);
      hints.push("    - Nếu local: service MongoDB có đang chạy?");
      hints.push("    - Nếu Atlas: connection string + IP whitelist?");
    }

    logger.error(
      { err: error },
      `MongoDB connection error: ${error?.message || "unknown"}`,
    );
    if (hints.length > 0) {
      // eslint-disable-next-line no-console
      console.error("\nGợi ý khắc phục:\n" + hints.join("\n") + "\n");
    }
    process.exit(1);
  }
};

export default connectDB;
