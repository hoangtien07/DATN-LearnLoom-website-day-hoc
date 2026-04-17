// Comprehensive seed cho đội QA.
// Chạy trên DB fresh (kéo code local, chưa có data).
//
// Usage:
//   node scripts/seedTestData.js              # dry-run (in kế hoạch)
//   node scripts/seedTestData.js --apply      # thực sự insert
//   node scripts/seedTestData.js --apply --purge  # xoá data QA cũ trước khi tạo
//
// Data seeded (đủ cover ~127 test case):
//   - 4 Subjects
//   - 8 Users: 1 admin, 2 instructors, 5 students (mỗi student có 1 context khác nhau)
//   - 6 Courses đa trạng thái: published, draft, pending review, rejected, free, approved-paid
//   - Lessons đa loại: Text, Video, Audio, Live + có isPreview
//   - 3 Quiz variants: timer bình thường, no-timer single-attempt, timer=1 để test TIMER_EXPIRED
//   - Enrollments ở nhiều mốc progress: 0%, 20%, 60%, 100%
//   - Orders: success / pending (retry) / fail
//   - Reviews: từ nhiều user, nhiều rating
//   - Instructor Applications: pending, approved, rejected
//   - Comments mẫu
//
// Chú ý: Hệ thống chỉ có Google OAuth. User tạo ra có googleId giả để
// API test qua Postman hoạt động (cookie + session cần được giả lập hoặc
// test manual login với Gmail thật). Xem docs/qa/README.md mục 5.

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Course from "../models/Course.js";
import {
  Lesson,
  TextLessonModel,
  VideoLessonModel,
  AudioLessonModel,
  LiveLessonModel,
} from "../models/Lesson.js";
import Assignment from "../models/Assignments.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import Subject from "../models/Subject.js";
import Comment from "../models/Comments.js";
import InstructorApplication from "../models/InstructorApplication.js";

dotenv.config();

const apply = process.argv.includes("--apply");
const purge = process.argv.includes("--purge");

const QA_EMAIL_DOMAIN = "learnloom.test";
const QA_SLUG_PREFIX = "test-";

const log = (...args) => console.log("[seed]", ...args);

// ---------- Data definitions ----------

const subjects = [
  "Lập trình",
  "Front-end",
  "Back-end",
  "Thiết kế",
];

const users = [
  {
    googleId: "qa-admin-googleid",
    username: "QA Admin",
    email: `admin.qa@${QA_EMAIL_DOMAIN}`,
    role: "admin",
    thumbnail: "https://i.pravatar.cc/150?img=12",
  },
  {
    googleId: "qa-instructor1-googleid",
    username: "QA Instructor One",
    email: `instructor1.qa@${QA_EMAIL_DOMAIN}`,
    role: "instructor",
    thumbnail: "https://i.pravatar.cc/150?img=14",
  },
  {
    googleId: "qa-instructor2-googleid",
    username: "QA Instructor Two",
    email: `instructor2.qa@${QA_EMAIL_DOMAIN}`,
    role: "instructor",
    thumbnail: "https://i.pravatar.cc/150?img=15",
  },
  {
    googleId: "qa-student1-googleid",
    username: "QA Student One",
    email: `student1.qa@${QA_EMAIL_DOMAIN}`,
    role: "student",
    thumbnail: "https://i.pravatar.cc/150?img=21",
    // enroll test-js-basic @ progress 60% (đủ để review)
  },
  {
    googleId: "qa-student2-googleid",
    username: "QA Student Two",
    email: `student2.qa@${QA_EMAIL_DOMAIN}`,
    role: "student",
    thumbnail: "https://i.pravatar.cc/150?img=22",
    // enroll test-js-basic @ progress 20% (chưa đủ review)
  },
  {
    googleId: "qa-student3-googleid",
    username: "QA Student Three",
    email: `student3.qa@${QA_EMAIL_DOMAIN}`,
    role: "student",
    thumbnail: "https://i.pravatar.cc/150?img=23",
    // chưa enroll gì — test BR-01 khoá content, test nộp đơn GV
  },
  {
    googleId: "qa-student4-googleid",
    username: "QA Student Four",
    email: `student4.qa@${QA_EMAIL_DOMAIN}`,
    role: "student",
    thumbnail: "https://i.pravatar.cc/150?img=24",
    // có instructor application PENDING — test admin duyệt
  },
  {
    googleId: "qa-student5-googleid",
    username: "QA Student Five",
    email: `student5.qa@${QA_EMAIL_DOMAIN}`,
    role: "student",
    thumbnail: "https://i.pravatar.cc/150?img=25",
    // có instructor application REJECTED — test xem reason, nộp lại
  },
];

// ---------- Helpers ----------

const purgeQaData = async () => {
  const usersDocs = await User.find({
    email: { $regex: `@${QA_EMAIL_DOMAIN}$` },
  });
  const userIds = usersDocs.map((u) => u._id);

  const coursesDocs = await Course.find({
    slug: { $regex: `^${QA_SLUG_PREFIX}` },
  });
  const courseIds = coursesDocs.map((c) => c._id);

  await Promise.all([
    InstructorApplication.deleteMany({ user: { $in: userIds } }),
    Comment.deleteMany({ author: { $in: userIds } }),
    Review.deleteMany({ userId: { $in: userIds } }),
    Order.deleteMany({ userId: { $in: userIds } }),
    Assignment.deleteMany({ course: { $in: courseIds } }),
    Lesson.deleteMany({ course: { $in: courseIds } }),
    Course.deleteMany({ _id: { $in: courseIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
    Subject.deleteMany({ name: { $in: subjects } }),
  ]);

  log(
    `purged: ${usersDocs.length} users, ${coursesDocs.length} courses + related`,
  );
};

const upsertUser = async (data) => {
  let doc = await User.findOne({ googleId: data.googleId });
  if (doc) return doc;
  doc = await User.create(data);
  return doc;
};

const buildLessonsForJsCourse = async (courseId) => {
  const preview = await TextLessonModel.create({
    course: courseId,
    name: "Giới thiệu JavaScript (preview)",
    description: "Mở cho mọi người xem",
    duration: 10,
    isPreview: true,
    content:
      "<h2>Chào mừng</h2><p>Đây là nội dung preview — guest cũng đọc được.</p>",
  });
  const videoLesson = await VideoLessonModel.create({
    course: courseId,
    name: "Biến và kiểu dữ liệu",
    description: "Nội dung trả phí — cần enroll",
    duration: 15,
    videoUrl: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
  });
  const textLesson = await TextLessonModel.create({
    course: courseId,
    name: "Vòng lặp và điều kiện",
    description: "Nội dung trả phí",
    duration: 20,
    content: "<p>Text lesson trả phí.</p>",
  });
  const audioLesson = await AudioLessonModel.create({
    course: courseId,
    name: "Phỏng vấn: Why JS?",
    description: "Audio lesson",
    duration: 12,
    audioUrl: "https://file-examples.com/storage/fe7b21ab6bmp3.mp3",
  });
  const liveLesson = await LiveLessonModel.create({
    course: courseId,
    name: "Q&A Live",
    description: "Live session",
    duration: 60,
    liveDate: new Date(Date.now() + 7 * 86400000), // 7 ngày tới
    link: "https://meet.google.com/qa-test",
  });
  return { preview, videoLesson, textLesson, audioLesson, liveLesson };
};

const buildQuizzesForJsCourse = async (courseId) => {
  const quizNormal = await Assignment.create({
    course: courseId,
    name: "Quiz 1 — cơ bản (5 phút, retake)",
    description: "Test BR-12/14. timer=5, allowRetake=true, maxAttempts=2",
    timer: 5,
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
        questionText: "2 + '2' = ?",
        options: [
          { text: "4", isCorrect: false },
          { text: "'22'", isCorrect: true },
          { text: "NaN", isCorrect: false },
        ],
        explanation: "Dấu + với chuỗi sẽ nối chuỗi.",
      },
    ],
  });

  const quizSingleShot = await Assignment.create({
    course: courseId,
    name: "Quiz 2 — không làm lại",
    description: "Test allowRetake=false",
    timer: null,
    allowRetake: false,
    maxAttempts: 1,
    questions: [
      {
        questionText: "var vs let khác gì?",
        options: [
          { text: "Không khác", isCorrect: false },
          { text: "Scope & hoisting", isCorrect: true },
        ],
        explanation: "let có block scope.",
      },
    ],
  });

  const quizShortTimer = await Assignment.create({
    course: courseId,
    name: "Quiz 3 — timer 1 phút (để test TIMER_EXPIRED)",
    description: "Gợi ý: start rồi đợi > 1 phút rồi submit → 408",
    timer: 1,
    allowRetake: true,
    maxAttempts: 3,
    questions: [
      {
        questionText: "Closure là gì?",
        options: [
          { text: "Hàm trong hàm", isCorrect: false },
          { text: "Hàm giữ reference đến scope tạo ra nó", isCorrect: true },
        ],
        explanation: "Closure giữ biến outer ngay cả khi outer đã return.",
      },
    ],
  });

  return { quizNormal, quizSingleShot, quizShortTimer };
};

// ---------- Main ----------

const main = async () => {
  if (!apply) {
    log("DRY-RUN — thêm --apply để ghi vào DB.");
    log("Planned:");
    log("  • 4 subjects");
    log("  • 8 users (1 admin + 2 instructors + 5 students)");
    log(
      "  • 6 courses: test-js-basic (paid+approved), test-react-advanced (paid+approved), test-css-draft (draft), test-html-pending (pending review), test-ui-rejected (rejected), test-free-html (free+approved)",
    );
    log("  • 5 lessons cho test-js-basic (1 preview + 4 paid types) + 3 quiz");
    log("  • Enrollments: s1 @ 60%, s2 @ 20%, s3 chưa enroll gì");
    log("  • Orders: s1 success, s1 pending (retry), s1 fail, s2 success");
    log("  • Reviews: s1 rating 5 sao cho test-js-basic");
    log("  • Instructor applications: s4 pending, s5 rejected");
    log("  • 2 sample comments");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  });

  if (purge) {
    await purgeQaData();
  }

  // 1. Subjects
  log("=== 1. Subjects ===");
  for (const name of subjects) {
    const exists = await Subject.findOne({ name });
    if (!exists) {
      await Subject.create({ name });
      log(`  + ${name}`);
    }
  }

  // 2. Users
  log("=== 2. Users ===");
  const userMap = {};
  for (const u of users) {
    const doc = await upsertUser(u);
    userMap[u.googleId] = doc;
    log(`  + ${u.email} (role=${u.role})`);
  }
  const admin = userMap["qa-admin-googleid"];
  const inst1 = userMap["qa-instructor1-googleid"];
  const inst2 = userMap["qa-instructor2-googleid"];
  const s1 = userMap["qa-student1-googleid"];
  const s2 = userMap["qa-student2-googleid"];
  const s3 = userMap["qa-student3-googleid"];
  const s4 = userMap["qa-student4-googleid"];
  const s5 = userMap["qa-student5-googleid"];

  // 3. Courses
  log("=== 3. Courses ===");

  // 3.1. test-js-basic — paid, approved, published (full lessons + quizzes)
  let jsCourse = await Course.findOne({ slug: `${QA_SLUG_PREFIX}js-basic` });
  if (!jsCourse) {
    jsCourse = await Course.create({
      name: "QA · JavaScript cơ bản",
      summary: "Khóa học dùng cho QA testing — trả phí, đã duyệt",
      description: "<p>Nội dung demo. Ideal cho BR-01/05/10/11/12/14.</p>",
      teacher: inst1._id,
      level: "Cơ bản",
      subject: "Lập trình",
      totalLessons: 5,
      totalDuration: 7,
      slug: `${QA_SLUG_PREFIX}js-basic`,
      totalStudentsEnrolled: 2,
      avgRating: 5,
      visible: true,
      image_url: "https://picsum.photos/seed/js/800/450",
      price: 199000,
      is_published: true,
      is_selling: true,
      published_at: new Date(Date.now() - 30 * 86400000),
      reviewStatus: "approved",
      reviewedBy: admin._id,
      reviewedAt: new Date(Date.now() - 30 * 86400000),
    });
    const lessons = await buildLessonsForJsCourse(jsCourse._id);
    const quizzes = await buildQuizzesForJsCourse(jsCourse._id);

    jsCourse.sections = [
      {
        name: "Phần 1 — Làm quen",
        items: [
          { itemType: "lesson", itemId: lessons.preview._id, order: 0 },
          { itemType: "lesson", itemId: lessons.videoLesson._id, order: 1 },
          { itemType: "lesson", itemId: lessons.textLesson._id, order: 2 },
        ],
      },
      {
        name: "Phần 2 — Nâng cao",
        items: [
          { itemType: "lesson", itemId: lessons.audioLesson._id, order: 0 },
          { itemType: "lesson", itemId: lessons.liveLesson._id, order: 1 },
          { itemType: "assignment", itemId: quizzes.quizNormal._id, order: 2 },
          {
            itemType: "assignment",
            itemId: quizzes.quizSingleShot._id,
            order: 3,
          },
          {
            itemType: "assignment",
            itemId: quizzes.quizShortTimer._id,
            order: 4,
          },
        ],
      },
    ];
    await jsCourse.save();
    log(`  + test-js-basic (with 5 lessons + 3 quizzes)`);

    // Save first lesson id for later (for comments)
    jsCourse.__previewLessonId = lessons.preview._id;
    jsCourse.__videoLessonId = lessons.videoLesson._id;
  } else {
    log("  = test-js-basic (existing)");
  }

  // 3.2. test-react-advanced — paid, approved, published (nhỏ hơn)
  let reactCourse = await Course.findOne({
    slug: `${QA_SLUG_PREFIX}react-advanced`,
  });
  if (!reactCourse) {
    reactCourse = await Course.create({
      name: "QA · React nâng cao",
      summary: "Khóa học nâng cao, trả phí cao",
      description: "<p>React hooks, context, performance.</p>",
      teacher: inst1._id,
      level: "Nâng cao",
      subject: "Front-end",
      totalLessons: 2,
      totalDuration: 42,
      slug: `${QA_SLUG_PREFIX}react-advanced`,
      totalStudentsEnrolled: 0,
      avgRating: 0,
      visible: true,
      image_url: "https://picsum.photos/seed/react/800/450",
      price: 499000,
      is_published: true,
      is_selling: true,
      published_at: new Date(Date.now() - 10 * 86400000),
      reviewStatus: "approved",
      reviewedBy: admin._id,
      reviewedAt: new Date(Date.now() - 10 * 86400000),
    });
    const l1 = await TextLessonModel.create({
      course: reactCourse._id,
      name: "Hooks căn bản (preview)",
      description: "Preview cho marketing",
      duration: 15,
      isPreview: true,
      content: "<p>Preview về useState/useEffect.</p>",
    });
    const l2 = await VideoLessonModel.create({
      course: reactCourse._id,
      name: "Context API",
      description: "Paid",
      duration: 27,
      videoUrl: "https://www.youtube.com/watch?v=35lXWvCuM8o",
    });
    reactCourse.sections = [
      {
        name: "Chương 1",
        items: [
          { itemType: "lesson", itemId: l1._id, order: 0 },
          { itemType: "lesson", itemId: l2._id, order: 1 },
        ],
      },
    ];
    await reactCourse.save();
    log(`  + test-react-advanced (paid+approved)`);
  } else {
    log("  = test-react-advanced (existing)");
  }

  // 3.3. test-css-draft — draft, reviewStatus="none"
  let cssCourse = await Course.findOne({ slug: `${QA_SLUG_PREFIX}css-draft` });
  if (!cssCourse) {
    cssCourse = await Course.create({
      name: "QA · CSS Draft",
      summary: "Khóa học bản nháp — dùng test BR-20 submit duyệt",
      description: "<p>Draft.</p>",
      teacher: inst2._id,
      level: "Cơ bản",
      subject: "Front-end",
      totalLessons: 0,
      slug: `${QA_SLUG_PREFIX}css-draft`,
      totalStudentsEnrolled: 0,
      visible: true,
      image_url: "https://picsum.photos/seed/css/800/450",
      price: 99000,
      is_published: false,
      reviewStatus: "none",
    });
    log(`  + test-css-draft (draft, reviewStatus=none)`);
  } else {
    log("  = test-css-draft (existing)");
  }

  // 3.4. test-html-pending — reviewStatus="pending" (cho admin duyệt)
  let htmlCourse = await Course.findOne({
    slug: `${QA_SLUG_PREFIX}html-pending`,
  });
  if (!htmlCourse) {
    htmlCourse = await Course.create({
      name: "QA · HTML từ A-Z",
      summary: "Khóa học đã gửi duyệt — chờ admin xử lý",
      description: "<p>Pending review.</p>",
      teacher: inst2._id,
      level: "Cơ bản",
      subject: "Front-end",
      totalLessons: 0,
      totalDuration: 3,
      slug: `${QA_SLUG_PREFIX}html-pending`,
      totalStudentsEnrolled: 0,
      visible: true,
      image_url: "https://picsum.photos/seed/html/800/450",
      price: 79000,
      is_published: false,
      reviewStatus: "pending",
      reviewSubmittedAt: new Date(Date.now() - 2 * 86400000),
    });
    log(`  + test-html-pending (reviewStatus=pending)`);
  } else {
    log("  = test-html-pending (existing)");
  }

  // 3.5. test-ui-rejected — reviewStatus="rejected" với reason
  let uiCourse = await Course.findOne({ slug: `${QA_SLUG_PREFIX}ui-rejected` });
  if (!uiCourse) {
    uiCourse = await Course.create({
      name: "QA · UI Thiết kế",
      summary: "Đã bị admin từ chối — để test instructor xem reason, gửi lại",
      description: "<p>Rejected.</p>",
      teacher: inst2._id,
      level: "Trung cấp",
      subject: "Thiết kế",
      totalLessons: 0,
      totalDuration: 4,
      slug: `${QA_SLUG_PREFIX}ui-rejected`,
      totalStudentsEnrolled: 0,
      visible: true,
      image_url: "https://picsum.photos/seed/ui/800/450",
      price: 89000,
      is_published: false,
      reviewStatus: "rejected",
      reviewSubmittedAt: new Date(Date.now() - 4 * 86400000),
      reviewedAt: new Date(Date.now() - 3 * 86400000),
      reviewedBy: admin._id,
      reviewRejectionReason:
        "Khóa học chưa đủ chiều sâu, thiếu phần thực hành. Vui lòng bổ sung ≥ 3 bài thực hành và gửi lại.",
    });
    log(`  + test-ui-rejected (reviewStatus=rejected với reason)`);
  } else {
    log("  = test-ui-rejected (existing)");
  }

  // 3.6. test-free-html — miễn phí, approved, published
  let freeCourse = await Course.findOne({
    slug: `${QA_SLUG_PREFIX}free-html`,
  });
  if (!freeCourse) {
    freeCourse = await Course.create({
      name: "QA · HTML cơ bản (miễn phí)",
      summary: "Khóa học miễn phí — test enroll flow free",
      description: "<p>Free!</p>",
      teacher: inst2._id,
      level: "Cơ bản",
      subject: "Front-end",
      totalLessons: 1,
      totalDuration: 2,
      slug: `${QA_SLUG_PREFIX}free-html`,
      totalStudentsEnrolled: 0,
      visible: true,
      image_url: "https://picsum.photos/seed/free/800/450",
      price: 0,
      is_published: true,
      is_selling: false,
      published_at: new Date(Date.now() - 5 * 86400000),
      reviewStatus: "approved",
      reviewedBy: admin._id,
      reviewedAt: new Date(Date.now() - 5 * 86400000),
    });
    const freeLesson = await TextLessonModel.create({
      course: freeCourse._id,
      name: "Học HTML trong 10 phút",
      description: "Free!",
      duration: 10,
      content: "<p>Nội dung miễn phí.</p>",
    });
    freeCourse.sections = [
      {
        name: "Chương 1",
        items: [{ itemType: "lesson", itemId: freeLesson._id, order: 0 }],
      },
    ];
    await freeCourse.save();
    log(`  + test-free-html (free+approved)`);
  } else {
    log("  = test-free-html (existing)");
  }

  // 4. Enrollments
  log("=== 4. Enrollments ===");
  const ensureEnrollment = async (user, course, progress) => {
    const exists = user.enrolledCourses?.some(
      (e) => String(e.courseId) === String(course._id),
    );
    if (exists) return false;
    user.enrolledCourses.push({
      courseId: course._id,
      progress,
      completedItems: [],
      lastAccessed: new Date(),
    });
    await user.save();
    return true;
  };

  if (await ensureEnrollment(s1, jsCourse, 60)) {
    log(`  + s1 → test-js-basic @ 60%`);
  }
  if (await ensureEnrollment(s2, jsCourse, 20)) {
    log(`  + s2 → test-js-basic @ 20%`);
  }

  // 5. Orders
  log("=== 5. Orders ===");
  const ensureOrder = async (user, course, status, extras = {}) => {
    const filter = { userId: user._id, courseId: course._id, paymentStatus: status };
    const existing = await Order.findOne(filter);
    if (existing) return false;
    await Order.create({
      userId: user._id,
      teacherId: course.teacher,
      courseId: course._id,
      courseName: course.name,
      amount: course.price,
      paymentMethod: "vn-pay",
      paymentStatus: status,
      ...extras,
    });
    return true;
  };

  if (
    await ensureOrder(s1, jsCourse, "success", {
      transactionId: `QA-TXN-${Date.now()}-1`,
      paidAt: new Date(Date.now() - 30 * 86400000),
    })
  ) {
    log(`  + s1 order success for test-js-basic`);
  }
  if (
    await ensureOrder(s1, cssCourse, "pending", {
      paymentGatewayTxnRef: `QA-ORD-${Date.now()}-PEND`,
    })
  ) {
    log(`  + s1 order pending for test-css-draft (retry flow)`);
  }
  if (
    await ensureOrder(s1, reactCourse, "fail", {
      paymentGatewayTxnRef: `QA-ORD-${Date.now()}-FAIL`,
      gatewayResponseCode: "24",
      failedAt: new Date(Date.now() - 1 * 86400000),
    })
  ) {
    log(`  + s1 order fail for test-react-advanced (retry flow)`);
  }
  if (
    await ensureOrder(s2, jsCourse, "success", {
      transactionId: `QA-TXN-${Date.now()}-2`,
      paidAt: new Date(Date.now() - 15 * 86400000),
    })
  ) {
    log(`  + s2 order success for test-js-basic`);
  }

  // 6. Reviews
  log("=== 6. Reviews ===");
  const existingReview = await Review.findOne({
    userId: s1._id,
    courseId: jsCourse._id,
  });
  if (!existingReview) {
    await Review.create({
      userId: s1._id,
      userName: s1.username,
      thumbnail: s1.thumbnail,
      courseId: jsCourse._id,
      rating: 5,
      comment: "Khóa học rất tốt — QA verified 5 sao.",
    });
    jsCourse.avgRating = 5;
    await jsCourse.save();
    log(`  + s1 review 5⭐ for test-js-basic`);
  } else {
    log(`  = s1 review exists`);
  }

  // 7. Instructor applications
  log("=== 7. Instructor Applications ===");
  const ensureApplication = async (user, status, extras = {}) => {
    const existing = await InstructorApplication.findOne({
      user: user._id,
      status,
    });
    if (existing) return false;
    await InstructorApplication.create({
      user: user._id,
      fullName: user.username,
      phone: "0912345678",
      expertise: "Lập trình web",
      motivation:
        "Em có kinh nghiệm 3 năm làm dev, muốn chia sẻ kiến thức với cộng đồng LearnLoom.",
      credentialsUrl: "https://example.com/cv.pdf",
      status,
      ...extras,
    });
    return true;
  };

  if (await ensureApplication(s4, "pending")) {
    log(`  + s4 application PENDING (for admin to approve)`);
  }
  if (
    await ensureApplication(s5, "rejected", {
      reviewedBy: admin._id,
      reviewedAt: new Date(Date.now() - 2 * 86400000),
      rejectionReason: "Hồ sơ chưa có chứng chỉ liên quan. Vui lòng bổ sung.",
    })
  ) {
    log(`  + s5 application REJECTED (for re-submit test)`);
  }

  // 8. Comments
  log("=== 8. Comments ===");
  const previewLesson = await Lesson.findOne({
    course: jsCourse._id,
    name: /Giới thiệu JavaScript/,
  });
  if (previewLesson) {
    const existingComments = await Comment.countDocuments({
      lesson: previewLesson._id,
    });
    if (existingComments === 0) {
      const c1 = await Comment.create({
        content: "Cảm ơn thầy, bài mở đầu rất dễ hiểu!",
        author: s1._id,
        course: jsCourse._id,
        lesson: previewLesson._id,
      });
      const c2 = await Comment.create({
        content: "Bạn hỏi rõ phần này được không?",
        author: s2._id,
        course: jsCourse._id,
        lesson: previewLesson._id,
      });
      log(`  + 2 comments on preview lesson`);
    } else {
      log(`  = comments exist`);
    }
  }

  // ---------- Summary ----------
  log("\n===== SEED DONE =====\n");
  log("QA accounts (login qua Google OAuth với email tương ứng,");
  log("hoặc đổi email trong file này sang Gmail thật của tester):\n");
  for (const u of users) {
    log(`  [${u.role.padEnd(10)}] ${u.email}`);
  }
  log("\nCourses (đã tạo):");
  log("  • test-js-basic       trả phí 199k · approved · published · có 3 quiz");
  log("  • test-react-advanced trả phí 499k · approved · published");
  log("  • test-css-draft      99k · reviewStatus=none (để test submit duyệt)");
  log("  • test-html-pending   79k · reviewStatus=pending (admin duyệt)");
  log("  • test-ui-rejected    89k · reviewStatus=rejected (xem reason)");
  log("  • test-free-html      MIỄN PHÍ · approved · published");

  log("\nUser states:");
  log("  • s1: enrolled js-basic @ 60% · đã review · có order success/pending/fail");
  log("  • s2: enrolled js-basic @ 20% · chưa review (progress < 50%)");
  log("  • s3: chưa enroll gì · chưa nộp đơn GV");
  log("  • s4: có đơn đăng ký giảng viên PENDING");
  log("  • s5: có đơn đăng ký giảng viên REJECTED");

  log("\nGợi ý test:");
  log("  BR-01 · guest/s3 GET /api/courses/items/lesson/:id → 401/403");
  log("  BR-03 · admin duyệt s4 application → s4 role=instructor");
  log("  BR-05 · s1 → /profile/orders → có 3 order");
  log("  BR-10 · s2 submit review → 403 PROGRESS_INSUFFICIENT");
  log("  BR-11 · s1 submit review lần 2 → 409 REVIEW_ALREADY_EXISTS");
  log("  BR-12 · start quiz 3 rồi đợi > 1 phút submit → 408 TIMER_EXPIRED");
  log("  BR-14 · submit quiz 1 lần đầu → response không có correctAnswer");
  log("  BR-17 · guest POST /api/chat/stream 6 tin → 429 GUEST_QUOTA_EXCEEDED");
  log("  BR-20 · admin duyệt test-html-pending → is_published=true");
  log("\nĐầy đủ test case: docs/qa/TEST_CASES.md");
  log("API cheatsheet: docs/qa/API_CHEATSHEET.md\n");

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
