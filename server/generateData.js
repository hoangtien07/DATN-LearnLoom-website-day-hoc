// Import các model cần thiết
import User from "./models/User.js";
import Course from "./models/Course.js";
import {
  Lesson,
  TextLessonModel,
  VideoLessonModel,
  AudioLessonModel,
  LiveLessonModel,
} from "./models/Lesson.js";
import Assignment from "./models/Assignments.js";
import { AssignmentResult } from "./models/Assignments.js";
import Review from "./models/Review.js";
import Comment from "./models/Comments.js";
import Notification from "./models/Notifications.js";
import Order from "./models/Order.js";
import Subject from "./models/Subject.js";
import mongoose from "mongoose";

// Kết nối đến MongoDB
mongoose.connect("mongodb://localhost:27017/svelte-courses", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB!");
});

// Hàm tạo dữ liệu ngẫu nhiên
const getRandomElement = (array) =>
  array[Math.floor(Math.random() * array.length)];

const sampleSubjects = [
  "Kiến trúc",
  "Nghệ thuật & Văn hóa",
  "Sinh học & Khoa học sự sống",
  "Kinh doanh & Quản lý",
  "Hóa học",
  "Truyền thông",
  "Khoa học máy tính",
  "Phân tích dữ liệu & Thống kê",
  "Thiết kế",
  "Kinh tế & Tài chính",
  "Giáo dục & Đào tạo giáo viên",
  "Điện tử",
  "Năng lượng & Khoa học Trái đất",
  "Kỹ thuật",
  "Nghiên cứu môi trường",
  "Đạo đức",
  "Thực phẩm & Dinh dưỡng",
  "Sức khỏe & An toàn",
  "Lịch sử",
  "Nhân văn",
  "Ngôn ngữ",
  "Luật",
  "Văn học",
  "Toán",
  "Y học",
  "Âm nhạc",
  "Triết học & Đạo đức",
  "Vật lý",
  "Khoa học",
  "Khoa học xã hội",
];

const sampleLevels = ["Sơ cấp", "Trung cấp", "Chuyên gia"];

const sampleImages = [
  "https://img-c.udemycdn.com/course/750x422/4159138_008f.jpg",
  "https://img-c.udemycdn.com/course/750x422/4784404_fca9_5.jpg",
  "https://img-c.udemycdn.com/course/750x422/5235602_9944_3.jpg",
  "https://img-c.udemycdn.com/course/750x422/5246952_37c4.jpg",
  "https://img-c.udemycdn.com/course/750x422/5286464_6f30_2.jpg",
  "https://img-c.udemycdn.com/course/750x422/5336186_db7c_6.jpg",
  "https://img-c.udemycdn.com/course/750x422/552190_c48b_5.jpg",
  "https://img-c.udemycdn.com/course/750x422/823546_a941.jpg",
  "https://img-c.udemycdn.com/course/750x422/1240000_c7f8_5.jpg",
  "https://img-c.udemycdn.com/course/750x422/1259170_cb84_3.jpg",
  "https://img-c.udemycdn.com/course/750x422/1849356_5a7f_5.jpg",
  "https://img-c.udemycdn.com/course/750x422/1875574_c174_7.jpg",
];

const sampleDescriptions = [
  "Khóa học này là cánh cửa mở ra thế giới [chủ đề khóa học], giúp bạn nắm vững kiến thức từ cơ bản đến nâng cao.",
  "Bạn muốn chinh phục [kỹ năng/lĩnh vực]? Khóa học này cung cấp cho bạn công cụ và chiến lược đã được chứng minh hiệu quả.",
  "Dành cho người mới bắt đầu: Khóa học này hướng dẫn bạn từng bước một, từ A đến Z, giúp bạn tự tin với [kỹ năng/lĩnh vực].",
  "Nâng cao kỹ năng của bạn lên một tầm cao mới! Khóa học này tập trung vào [điểm đặc biệt của khóa học], giúp bạn trở nên chuyên nghiệp hơn.",
  "Học từ chuyên gia hàng đầu: Khóa học được giảng dạy bởi [tên giảng viên/kinh nghiệm], với nhiều năm kinh nghiệm thực tế.",
  "Thực hành là chìa khóa thành công! Khóa học này bao gồm nhiều bài tập thực hành, giúp bạn áp dụng kiến thức vào thực tế.",
  "Tiết kiệm thời gian và công sức: Khóa học được thiết kế cô đọng, dễ hiểu, giúp bạn học nhanh chóng và hiệu quả.",
  "Tham gia cộng đồng học viên năng động: Kết nối và học hỏi kinh nghiệm từ những người có cùng chí hướng.",
  "Cam kết hỗ trợ học viên tận tâm: Mọi thắc mắc của bạn sẽ được giải đáp bởi đội ngũ giảng viên giàu kinh nghiệm.",
  "Đầu tư cho tương lai của bạn ngay hôm nay! Khóa học này là bước đệm vững chắc cho sự nghiệp của bạn.",
];

const sampleContents = [
  "Nội dung bài học 1",
  "Nội dung bài học 2",
  "Nội dung bài học 3",
];

const sampleQuestions = ["Câu hỏi 1?", "Câu hỏi 2?", "Câu hỏi 3?"];

const sampleOptions = [
  { text: "Đáp án A", isCorrect: true },
  { text: "Đáp án B", isCorrect: false },
  { text: "Đáp án C", isCorrect: false },
];

const sampleComments = [
  "Bài học rất hay!",
  "Cảm ơn bạn đã chia sẻ!",
  "Tôi có một câu hỏi...",
];

const sampleNotifications = [
  "Bạn có thông báo mới",
  "Khóa học mới đã được thêm",
  "Bài tập đã được cập nhật",
];

// Tạo dữ liệu mẫu
const createSampleData = async () => {
  try {
    // Xóa dữ liệu cũ (nếu có)
    // await Course.deleteMany({});
    // await Lesson.deleteMany({});
    // await Assignment.deleteMany({});
    // await Review.deleteMany({});
    // await Comment.deleteMany({});
    // await Order.deleteMany({});

    // Hàm tạo googleId ngẫu nhiên
    const generateRandomGoogleId = () => {
      const prefix = "1118";
      const timestamp = Date.now().toString().slice(0, 10); // Lấy 10 chữ số đầu của timestamp
      const randomDigits = Math.floor(Math.random() * 1000000000000)
        .toString()
        .padStart(13, "0"); // Tạo 13 chữ số ngẫu nhiên
      return `${prefix}${timestamp}${randomDigits}`;
    };

    // Danh sách họ và tên tiếng Việt
    const ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Phan", "Đỗ"];
    const ten = [
      "An",
      "Bình",
      "Chi",
      "Dũng",
      "Giang",
      "Hòa",
      "Khánh",
      "Linh",
      "Minh",
      "Nam",
      "Ngọc",
      "Phương",
      "Quân",
      "Thảo",
      "Tú",
      "Uyên",
      "Vy",
      "Xuân",
      "Yến",
    ];

    // Hàm tạo tên người Việt ngẫu nhiên
    const generateRandomVietnameseName = () => {
      return `${getRandomElement(ho)} ${getRandomElement(ten)}`;
    };

    // Tạo 10 người dùng
    const users = await Promise.all(
      Array.from({ length: 5 }).map(async (_, i) => {
        const newUser = new User({
          googleId: generateRandomGoogleId(),
          username: generateRandomVietnameseName(),
          email: `user${i + 1}-${Date.now()}@example.com`,
          thumbnail:
            "https://lh3.googleusercontent.com/a/ACg8ocIOf7Yv7MMzt5uaVMd2KjBPhrxI5izw4YbLoArpCCbKk6vXcw=s96-c",
          role: "student",
        });
        return await newUser.save();
      })
    );

    console.log(users);

    // // Tạo 10 môn học
    // const subjects = await Promise.all(
    //   sampleSubjects.slice(0, 10).map(async (subjectName) => {
    //     const newSubject = new Subject({
    //       name: subjectName,
    //     });
    //     return await newSubject.save();
    //   })
    // );

    // // Tạo 10 khóa học
    // const courses = await Promise.all(
    //   Array.from({ length: 10 }).map(async (_, i) => {
    //     const newCourse = new Course({
    //       name: `Khóa học ${i + 1}`,
    //       summary: `Mô tả ngắn gọn về khóa học ${i + 1}`,
    //       description: getRandomElement(sampleDescriptions),
    //       teacher: getRandomElement(users)._id,
    //       overviewVideo: `https://example.com/video${i + 1}.mp4`,
    //       level: getRandomElement(sampleLevels),
    //       subject: getRandomElement(subjects)._id,
    //       totalLessons: Math.floor(Math.random() * 20) + 1,
    //       totalDuration: Math.floor(Math.random() * 100) + 1,
    //       slug: `khoa-hoc-${i + 1}`,
    //       totalStudentsEnrolled: Math.floor(Math.random() * 1000) + 1,
    //       avgRating: (Math.random() * 5).toFixed(1),
    //       visible: Math.random() < 0.8, // 80% khóa học hiển thị
    //       image_url: getRandomElement(sampleImages),
    //       price: (Math.random() * 1000000).toFixed(0),
    //       old_price: (Math.random() * 1000000).toFixed(0),
    //       is_published: Math.random() < 0.9, // 90% khóa học đã xuất bản
    //       is_selling: Math.random() < 0.7, // 70% khóa học đang bán
    //       published_at: new Date(
    //         Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
    //       ), // Ngày xuất bản trong vòng 1 năm qua
    //       sections: [],
    //       reviews: [],
    //     });
    //     return await newCourse.save();
    //   })
    // );

    // // Tạo 10 bài học và bài tập cho mỗi khóa học
    // await Promise.all(
    //   courses.map(async (course) => {
    //     const numSections = Math.floor(Math.random() * 5) + 1; // 1-5 sections per course

    //     for (let j = 0; j < numSections; j++) {
    //       const section = {
    //         _id: new mongoose.Types.ObjectId(),
    //         name: `Phần ${j + 1}`,
    //         items: [],
    //       };

    //       const numItems = Math.floor(Math.random() * 5) + 1; // 1-5 items per section

    //       for (let k = 0; k < numItems; k++) {
    //         const itemType = getRandomElement(["lesson", "assignment"]);

    //         let newItem;
    //         if (itemType === "lesson") {
    //           const lessonType = getRandomElement([
    //             "TextLesson",
    //             "VideoLesson",
    //             "AudioLesson",
    //             "LiveLesson",
    //           ]);

    //           const lessonData = {
    //             course: course._id,
    //             name: `Bài học ${k + 1}`,
    //             description: getRandomElement(sampleDescriptions),
    //             duration: Math.floor(Math.random() * 60) + 1, // 1-60 minutes
    //           };

    //           switch (lessonType) {
    //             case "TextLesson":
    //               lessonData.content = getRandomElement(sampleContents);
    //               newItem = new TextLessonModel(lessonData);
    //               break;
    //             case "VideoLesson":
    //               lessonData.videoUrl = `https://example.com/video${k + 1}.mp4`;
    //               newItem = new VideoLessonModel(lessonData);
    //               break;
    //             case "AudioLesson":
    //               lessonData.audioUrl = `https://example.com/audio${k + 1}.mp3`;
    //               newItem = new AudioLessonModel(lessonData);
    //               break;
    //             case "LiveLesson":
    //               lessonData.liveDate = new Date();
    //               lessonData.link = `https://example.com/live${k + 1}`;
    //               newItem = new LiveLessonModel(lessonData);
    //               break;
    //           }
    //         } else {
    //           newItem = new Assignment({
    //             course: course._id,
    //             name: `Bài tập ${k + 1}`,
    //             description: getRandomElement(sampleDescriptions),
    //             questions: [
    //               {
    //                 questionText: getRandomElement(sampleQuestions),
    //                 options: sampleOptions,
    //                 explanation: "Giải thích cho đáp án đúng",
    //               },
    //             ],
    //             timer: Math.floor(Math.random() * 60) + 1, // 1-60 minutes
    //             allowRetake: Math.random() < 0.5, // 50% chance of allowing retake
    //           });
    //         }

    //         await newItem.save();

    //         section.items.push({
    //           itemType,
    //           itemId: newItem._id,
    //           order: k,
    //         });
    //       }

    //       course.sections.push(section);
    //     }

    //     await course.save();
    //   })
    // );

    // // Tạo 10 đánh giá
    // const reviews = await Promise.all(
    //   Array.from({ length: 10 }).map(async () => {
    //     const randomCourse = getRandomElement(courses);
    //     const randomUser = getRandomElement(users);
    //     const newReview = new Review({
    //       userId: randomUser._id,
    //       userName: randomUser.username,
    //       thumbnail: randomUser.thumbnail,
    //       courseId: randomCourse._id,
    //       rating: Math.floor(Math.random() * 5) + 1,
    //       comment: getRandomElement(sampleComments),
    //     });
    //     return await newReview.save();
    //   })
    // );

    // // Tạo 10 bình luận
    // const comments = await Promise.all(
    //   Array.from({ length: 10 }).map(async () => {
    //     const randomCourse = getRandomElement(courses);
    //     const randomUser = getRandomElement(users);
    //     const randomLesson = getRandomElement(
    //       (await Lesson.find()).map((lesson) => lesson._id)
    //     );
    //     const newComment = new Comment({
    //       content: getRandomElement(sampleComments),
    //       author: randomUser._id,
    //       course: randomCourse._id,
    //       lesson: randomLesson,
    //     });
    //     return await newComment.save();
    //   })
    // );

    // // Tạo 10 thông báo
    // const notifications = await Promise.all(
    //   Array.from({ length: 10 }).map(async () => {
    //     const randomUser = getRandomElement(users);
    //     const newNotification = new Notification({
    //       content: getRandomElement(sampleNotifications),
    //       type: getRandomElement(["System", "Personal"]),
    //       recipient: randomUser._id,
    //       sender: getRandomElement(users)._id,
    //     });
    //     return await newNotification.save();
    //   })
    // );

    // // Tạo 10 đơn hàng
    // const orders = await Promise.all(
    //   Array.from({ length: 10 }).map(async () => {
    //     const randomCourse = getRandomElement(courses);
    //     const randomUser = getRandomElement(users);
    //     const newOrder = new Order({
    //       userId: randomUser._id,
    //       teacherId: randomCourse.teacher,
    //       courseId: randomCourse._id,
    //       courseName: randomCourse.name,
    //       courseImage: randomCourse.image_url,
    //       amount: parseFloat(randomCourse.price),
    //       paymentMethod: "vn-pay",
    //       paymentStatus: getRandomElement(["success", "fail", "pending"]),
    //     });
    //     return await newOrder.save();
    //   })
    // );

    console.log("Sample data created successfully!");
  } catch (error) {
    console.error("Error creating sample data:", error);
  } finally {
    // Đóng kết nối MongoDB
    await mongoose.disconnect();
  }
};

createSampleData();
