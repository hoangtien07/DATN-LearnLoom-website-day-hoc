// Migration một lần sau khi thêm field `reviewStatus`.
// Logic:
//   - Course đã is_published=true → reviewStatus = "approved" (coi như đã được chấp thuận).
//   - Course còn lại giữ mặc định "none".
// Usage:
//   node scripts/migrateReviewStatus.js --apply
//   (bỏ --apply để chạy dry-run, chỉ đếm bao nhiêu doc sẽ đổi)
import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "../models/Course.js";

dotenv.config();

const apply = process.argv.includes("--apply");

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });

  const filter = {
    is_published: true,
    $or: [{ reviewStatus: { $exists: false } }, { reviewStatus: "none" }],
  };

  const count = await Course.countDocuments(filter);
  console.log(`[migrateReviewStatus] matched: ${count} course(s)`);

  if (!apply) {
    console.log("Dry-run mode — add --apply to actually update.");
    await mongoose.disconnect();
    return;
  }

  const result = await Course.updateMany(filter, {
    $set: { reviewStatus: "approved" },
  });
  console.log(`[migrateReviewStatus] modified: ${result.modifiedCount}`);

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
