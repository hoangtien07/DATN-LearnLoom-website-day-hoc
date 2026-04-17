// Seed dữ liệu test cho đội QA.
// Usage:
//   node scripts/seedTestData.js              # dry-run (in kế hoạch)
//   node scripts/seedTestData.js --apply      # thực sự insert
//   node scripts/seedTestData.js --apply --purge  # xoá toàn bộ QA data cũ trước khi tạo
//
// Tạo:
//   - 4 users: admin.qa, instructor.qa, student1.qa, student2.qa
//   - 2 courses của instructor: "test-js-basic" (trả phí, đã approved+published),
//                               "test-css-draft" (đang draft)
//   - student1 enrolled test-js-basic với progress 60%
//   - 1 order success cho student1, 1 order pending cho student1
//   - 1 review của student1 (rating 5)
//
// Lưu ý: vì hệ thống chỉ hỗ trợ Google OAuth, tài khoản tạo ra có `googleId` giả.
// Muốn login thật trên UI, cần đổi email trong script này sang Gmail của QA tester
// rồi login bằng OAuth — khi đó hệ thống sẽ tìm user theo googleId thật và không trùng.
// Thay vào đó, đội QA có thể test API qua Postman bằng cách "ghi đè session" —
// xem docs/qa/API_CHEATSHEET.md.

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Course from "../models/Course.js";
import {
  Lesson,
  TextLessonModel,
  VideoLessonModel,
} from "../models/Lesson.js";
import Assignment from "../models/Assignments.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";

dotenv.config();

const apply = process.argv.includes("--apply");
const purge = process.argv.includes("--purge");

const QA_EMAIL_DOMAIN = "learnloom.test";

const log = (...args) => console.log("[seedTestData]", ...args);

const qaUsers = [
  {
    googleId: "qa-admin-googleid",
    username: "QA Admin",
    email: `admin.qa@${QA_EMAIL_DOMAIN}`,
    role: "admin",
  },
  {
    googleId: "qa-instructor-googleid",
    username: "QA Instructor",
    email: `instructor.qa@${QA_EMAIL_DOMAIN}`,
    role: "instructor",
  },
  {
    googleId: "qa-student1-googleid",
    username: "QA Student One",
    email: `student1.qa@${QA_EMAIL_DOMAIN}`,
    role: "student",
  },
  {
    googleId: "qa-student2-googleid",
    username: "QA Student Two",
    email: `student2.qa@${QA_EMAIL_DOMAIN}`,
    role: "student",
  },
];

const purgeQaData = async () => {
  // Xoá theo email domain để không đụng data production.
  const users = await User.find({ email: { $regex: `@${QA_EMAIL_DOMAIN}$` } });
  const userIds = users.map((u) => u._id);

  const courses = await Course.find({ slug: { $in: ["test-js-basic", "test-css-draft"] } });
  const courseIds = courses.map((c) => c._id);

  await Promise.all([
    Order.deleteMany({ userId: { $in: userIds } }),
    Review.deleteMany({ userId: { $in: userIds } }),
    Assignment.deleteMany({ course: { $in: courseIds } }),
    Lesson.deleteMany({ course: { $in: courseIds } }),
    Course.deleteMany({ _id: { $in: courseIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ]);

  log(
    `purged: ${users.length} users, ${courses.length} courses + related content`,
  );
};

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });

  if (!apply) {
    log("DRY-RUN — sẽ không ghi gì. Thêm --apply để thực sự tạo.");
    log("Planned operations:");
    log("  + 4 QA users");
    log("  + 2 courses (test-js-basic, test-css-draft)");
    log("  + 3 lessons (1 preview, 2 trả phí) + 1 quiz");
    log("  + 1 enrollment (student1 @ test-js-basic, progress 60%)");
    log("  + 2 orders (1 success, 1 pending) cho student1");
    log("  + 1 review của student1");
    await mongoose.disconnect();
    return;
  }

  if (purge) {
    await purgeQaData();
  }

  // 1. Users
  const users = {};
  for (const u of qaUsers) {
    const existing = await User.findOne({ googleId: u.googleId });
    if (existing) {
      users[u.role === "student" ? u.username : u.role] = existing;
      log(`user exists: ${u.email}`);
      continue;
    }
    const created = await User.create(u);
    users[u.role === "student" ? u.username : u.role] = created;
    log(`user created: ${u.email} (id=${created._id})`);
  }
  const admin = users.admin;
  const instructor = users.instructor;
  const student1 = users["QA Student One"];
  const student2 = users["QA Student Two"];

  // 2. Course "test-js-basic" — trả phí, đã approved & published
  let jsCourse = await Course.findOne({ slug: "test-js-basic" });
  if (!jsCourse) {
    jsCourse = await Course.create({
      name: "QA · JavaScript cơ bản",
      summary: "Khóa học dùng cho testing — trả phí",
      description: "<p>Nội dung demo cho QA.</p>",
      teacher: instructor._id,
      level: "Cơ bản",
      subject: "Lập trình",
      totalLessons: 3,
      totalDuration: 5,
      slug: "test-js-basic",
      totalStudentsEnrolled: 1,
      visible: true,
      image_url: "https://picsum.photos/seed/js/600/400",
      price: 199000,
      is_published: true,
      is_selling: true,
      published_at: new Date(),
      reviewStatus: "approved",
      reviewedBy: admin._id,
      reviewedAt: new Date(),
    });
    log(`course created: test-js-basic (id=${jsCourse._id})`);

    // Lessons
    const previewLesson = await TextLessonModel.create({
      course: jsCourse._id,
      name: "Giới thiệu JS (preview)",
      description: "Bài giới thiệu miễn phí",
      duration: 10,
      isPreview: true,
      content: "<p>Nội dung preview ai cũng xem được.</p>",
    });
    const paidLesson1 = await VideoLessonModel.create({
      course: jsCourse._id,
      name: "Biến & kiểu dữ liệu",
      description: "Paid content — cần enroll",
      duration: 15,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    const paidLesson2 = await TextLessonModel.create({
      course: jsCourse._id,
      name: "Điều kiện & vòng lặp",
      description: "Paid content — cần enroll",
      duration: 15,
      content: "<p>Nội dung trả phí (video+text).</p>",
    });

    // Quiz (BR-12/14 testing)
    const quiz = await Assignment.create({
      course: jsCourse._id,
      name: "Quiz JS",
      description: "Test nhanh",
      timer: 5, // 5 phút — đủ để QA test nhanh. Đổi thành 1 khi test TIMER_EXPIRED.
      allowRetake: true,
      maxAttempts: 2,
      questions: [
        {
          questionText: "typeof null === ?",
          options: [
            { text: "'null'", isCorrect: false },
            { text: "'object'", isCorrect: true },
            { text: "'undefined'", isCorrect: false },
          ],
          explanation: "Lịch sử JS — typeof null trả về 'object'.",
        },
        {
          questionText: "2 + 2 = ?",
          options: [
            { text: "3", isCorrect: false },
            { text: "4", isCorrect: true },
            { text: "22", isCorrect: false },
          ],
          explanation: "Cộng 2 số nguyên.",
        },
      ],
    });

    // Gắn vào sections
    jsCourse.sections = [
      {
        name: "Phần 1 — Làm quen",
        items: [
          { itemType: "lesson", itemId: previewLesson._id, order: 0 },
          { itemType: "lesson", itemId: paidLesson1._id, order: 1 },
        ],
      },
      {
        name: "Phần 2 — Kiểm tra",
        items: [
          { itemType: "lesson", itemId: paidLesson2._id, order: 0 },
          { itemType: "assignment", itemId: quiz._id, order: 1 },
        ],
      },
    ];
    await jsCourse.save();
    log("  lessons + quiz created and linked to sections");
  } else {
    log("course exists: test-js-basic");
  }

  // 3. Course "test-css-draft" — instructor chưa submit review
  let cssCourse = await Course.findOne({ slug: "test-css-draft" });
  if (!cssCourse) {
    cssCourse = await Course.create({
      name: "QA · CSS Draft",
      summary: "Course bản nháp cho testing BR-20",
      description: "<p>Draft.</p>",
      teacher: instructor._id,
      level: "Cơ bản",
      subject: "Front-end",
      totalLessons: 0,
      slug: "test-css-draft",
      visible: true,
      image_url: "https://picsum.photos/seed/css/600/400",
      price: 99000,
      is_published: false,
      reviewStatus: "none",
    });
    log(`course created: test-css-draft (id=${cssCourse._id})`);
  } else {
    log("course exists: test-css-draft");
  }

  // 4. Enroll student1 vào test-js-basic với progress 60%
  const alreadyEnrolled = student1.enrolledCourses?.some(
    (e) => String(e.courseId) === String(jsCourse._id),
  );
  if (!alreadyEnrolled) {
    student1.enrolledCourses.push({
      courseId: jsCourse._id,
      progress: 60,
      completedItems: [],
      lastAccessed: new Date(),
    });
    await student1.save();
    log("student1 enrolled in test-js-basic with progress=60");
  } else {
    log("student1 already enrolled in test-js-basic");
  }

  // 5. Orders
  const hasSuccessOrder = await Order.findOne({
    userId: student1._id,
    courseId: jsCourse._id,
    paymentStatus: "success",
  });
  if (!hasSuccessOrder) {
    await Order.create({
      userId: student1._id,
      teacherId: instructor._id,
      courseId: jsCourse._id,
      courseName: jsCourse.name,
      amount: jsCourse.price,
      paymentMethod: "vn-pay",
      paymentStatus: "success",
      transactionId: `QA-TXN-${Date.now()}`,
      paidAt: new Date(Date.now() - 86400000),
    });
    log("order created: student1 success purchase");
  }
  const hasPendingOrder = await Order.findOne({
    userId: student1._id,
    courseId: cssCourse._id,
    paymentStatus: "pending",
  });
  if (!hasPendingOrder) {
    await Order.create({
      userId: student1._id,
      teacherId: instructor._id,
      courseId: cssCourse._id,
      courseName: cssCourse.name,
      amount: cssCourse.price,
      paymentMethod: "vn-pay",
      paymentStatus: "pending",
    });
    log("order created: student1 pending (có thể thanh toán lại)");
  }

  // 6. Review của student1 (đủ progress, unique)
  const hasReview = await Review.findOne({
    userId: student1._id,
    courseId: jsCourse._id,
  });
  if (!hasReview) {
    await Review.create({
      userId: student1._id,
      userName: student1.username,
      thumbnail: student1.thumbnail,
      courseId: jsCourse._id,
      rating: 5,
      comment: "Khóa học ổn áp, QA approved!",
    });
    // update avgRating
    jsCourse.avgRating = 5;
    await jsCourse.save();
    log("review created: student1 @ test-js-basic 5 sao");
  }

  log("\n===== SEED DONE =====");
  log("QA accounts (login qua Google OAuth với email tương ứng):");
  for (const u of qaUsers) {
    log(`  [${u.role.padEnd(10)}] ${u.email}`);
  }
  log("\nCourses:");
  log("  test-js-basic   (trả phí 199k, đã approved+published)");
  log("  test-css-draft  (nháp 99k, chưa submit review)");
  log(
    "\nMẹo: xem full test case tại docs/qa/TEST_CASES.md, cheatsheet API ở docs/qa/API_CHEATSHEET.md.",
  );

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
