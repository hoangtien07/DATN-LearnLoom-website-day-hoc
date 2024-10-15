// server/controllers/courseController.js
import Course from "../models/Course.js";
import {
  Lesson,
  TextLessonModel,
  VideoLessonModel,
  AudioLessonModel,
  LiveLessonModel,
} from "../models/Lesson.js";
import Assignment from "../models/Assignments.js";
import { AssignmentResult } from "../models/Assignments.js";
import User from "../models/User.js";
// ------------------------------------
// CRUD for Courses
// ------------------------------------

// Create a new course
export const createCourse = async (req, res) => {
  try {
    const {
      name,
      summary,
      description,
      teacher,
      overviewVideo,
      level,
      subject,
      totalLessons,
      totalDuration,
      slug,
      totalStudentsEnrolled,
      visible,
      image_url,
      price,
      old_price,
      is_published,
      is_selling,
      published_at,
      sections,
      reviews,
    } = req.body;

    // Kiểm tra giáo viên có tồn tại
    const teacherExists = await User.findById(teacher);
    if (!teacherExists) {
      return res.status(400).json({ message: "Teacher not found" });
    }

    const course = new Course({
      name,
      summary,
      description,
      teacher: teacherExists,
      overviewVideo,
      level,
      subject,
      totalLessons,
      totalDuration,
      slug,
      totalStudentsEnrolled,
      visible,
      image_url,
      price,
      old_price,
      is_published,
      is_selling,
      published_at,
      sections,
      reviews,
    });

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a course
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      {
        new: true,
      }
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Soft delete a course (set visible to false)
export const softDeleteCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { slug: req.params.slug },
      { visible: false },
      { new: true }
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ message: "Course moved to trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const deletedCourse = await Course.findOneAndDelete({
      slug: req.params.slug,
    });
    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------------------------
// GET functions for Courses
// ------------------------------------

// Get course by slug
export const getCourseBySlug = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).populate([
      {
        path: "sections.items.itemId",
        options: { discriminatorKey: "type" },
        populate: {
          path: "questions.answers", // Assuming questions belong to assignments
        },
      },
      { path: "teacher" },
    ]);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCourseByInstructor = async (req, res) => {
  try {
    const courses = await Course.find({
      teacher: req.params.instructorId,
    }).populate("teacher");
    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses found for this instructor" });
    }
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all courses (with optional filters)
export const getCourses = async (req, res) => {
  try {
    const { subjects, levels, durations, prices } = req.query;

    // Build the filter object
    const filters = { visible: true };

    if (subjects) {
      filters.subject = { $in: subjects.split(",") };
    }
    if (levels) {
      filters.level = { $in: levels.split(",") };
    }
    if (durations) {
      const durationQueries = durations.split(",").map((duration) => {
        if (duration === "Hơn 40 giờ") {
          return { totalDuration: { $gte: 40 } };
        } else {
          const [min, max] = duration.split("-");
          return { totalDuration: { $gte: parseInt(min), $lt: parseInt(max) } };
        }
      });
      filters.$or = durationQueries;
    }
    if (prices) {
      const priceQueries = [];
      if (prices.includes("Miễn phí")) {
        priceQueries.push({ price: 0 });
      }
      if (prices.includes("Có trả phí")) {
        priceQueries.push({ price: { $gt: 0 } });
      }
      if (priceQueries.length > 0) {
        filters.$or = priceQueries;
      }
    }

    const courses = await Course.find(filters).populate("teacher");
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------------------------
// Functions for Sections and Items
// ------------------------------------

// Add a new section
export const addSection = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name } = req.body;

    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.sections.push({ name });
    await course.save();

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all sections
export const getSectionsByCourseSlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const course = await Course.findOne({ slug }).populate(
      "sections.items.itemId"
    );

    if (!course) {
      return res.status(404).json({ message: "Section not found" });
    }

    res.json(course.sections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a section
export const updateSection = async (req, res) => {
  try {
    const { slug, sectionId } = req.params;
    const { name } = req.body;

    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const section = course.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    section.name = name;

    await course.save();

    res.json(section);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a section
export const deleteSection = async (req, res) => {
  try {
    const { slug, sectionId } = req.params;

    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Tìm section bằng _id
    const sectionIndex = course.sections.findIndex(
      (section) => section._id.toString() === sectionId
    );

    if (sectionIndex === -1) {
      return res.status(404).json({ message: "Section not found" });
    }

    // Xóa section khỏi mảng
    course.sections.splice(sectionIndex, 1);

    await course.save();

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hàm di chuyển item trong mảng
const moveArrayItem = (arr, fromIndex, toIndex) => {
  const [item] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, item);
  return arr;
};

// Sắp xếp lại thứ tự các section
export const reorderSections = async (req, res) => {
  console.log(req.body);
  try {
    const { slug } = req.params;
    const { startIndex, endIndex } = req.body;

    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.sections = moveArrayItem(course.sections, startIndex, endIndex);
    await course.save();

    res.json(course.sections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assignment
// ------------------------------------

// Lấy assignment theo ID
export const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lessons
// ------------------------------------

// Get a lesson by ID (This function can be used for any section)
export const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;

    // Tìm lesson bằng _id (sử dụng Lesson model)
    const lesson = await Lesson.findById(lessonId).populate("course");

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    // Lấy dữ liệu cụ thể của loại bài học
    let specificLesson;
    switch (lesson.type) {
      case "TextLesson":
        specificLesson = await TextLessonModel.findById(lessonId);
        break;
      case "VideoLesson":
        specificLesson = await VideoLessonModel.findById(lessonId);
        break;
      case "AudioLesson":
        specificLesson = await AudioLessonModel.findById(lessonId);
        break;
      case "LiveLesson":
        specificLesson = await LiveLessonModel.findById(lessonId);
        break;
      default:
        return res.status(400).json({ message: "Invalid lesson type" });
    }

    res.json(specificLesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------------------------
// Functions for Items
// ------------------------------------

// Thêm một item (lesson hoặc assignment) vào một section
export const addItemToSection = async (req, res) => {
  try {
    const { slug, sectionId } = req.params;
    const { itemType, ...itemData } = req.body;

    console.log(itemData, itemType);

    const course = await Course.findOne({ slug });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const section = course.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    let newItem;
    itemData.course = course._id;
    if (itemType === "lesson") {
      const { type } = itemData;
      switch (type) {
        case "TextLesson":
          newItem = new TextLessonModel(itemData);
          break;
        case "VideoLesson":
          newItem = new VideoLessonModel(itemData);
          break;
        case "AudioLesson":
          newItem = new AudioLessonModel(itemData);
          break;
        case "LiveLesson":
          newItem = new LiveLessonModel(itemData);
          break;
        default:
          return res.status(400).json({ message: "Invalid lesson type" });
      }
      await newItem.save();
    } else if (itemType === "assignment") {
      newItem = new Assignment(itemData);
      await newItem.save();
    } else {
      return res.status(400).json({ message: "Invalid item type" });
    }

    console.log(newItem._id);

    section.items.push({
      itemType,
      itemId: newItem._id,
      order: section.items.length,
    });
    console.log(section.items);

    await course.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: `Error adding item: ${error.message}` });
  }
};

// Lấy dữ liệu một item (lesson hoặc assignment)
export const getItem = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    let item;

    if (itemType === "lesson") {
      // Tìm lesson bằng _id (sử dụng Lesson model)
      item = await Lesson.findOne({ _id: itemId }).populate("course");

      if (!item) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Lấy dữ liệu cụ thể của loại bài học
      switch (item.type) {
        case "TextLesson":
          item = await TextLessonModel.findOne({ _id: itemId });
          break;
        case "VideoLesson":
          item = await VideoLessonModel.findOne({ _id: itemId });
          break;
        case "AudioLesson":
          item = await AudioLessonModel.findOne({ _id: itemId });
          break;
        case "LiveLesson":
          item = await LiveLessonModel.findOne({ _id: itemId });
          break;
        default:
          return res.status(400).json({ message: "Invalid lesson type" });
      }
    } else if (itemType === "assignment") {
      // Tìm assignment bằng _id
      item = await Assignment.findOne({ _id: itemId }).populate("course");

      if (!item) {
        return res.status(404).json({ message: "Assignment not found" });
      }
    } else {
      return res.status(400).json({ message: "Invalid item type" });
    }

    res.json(item);
  } catch (error) {
    console.error("Lỗi khi lấy item:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật một item (lesson hoặc assignment)
export const updateItem = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const updatedItemData = req.body; // Lấy dữ liệu cập nhật từ request body

    let updatedItem;
    console.log(updatedItemData);

    if (itemType === "lesson") {
      // Tìm lesson để lấy type hiện tại
      const existingLesson = await Lesson.findById(itemId);

      if (!existingLesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Tìm và cập nhật lesson dựa vào type hiện tại
      switch (existingLesson.type) {
        case "TextLesson":
          updatedItem = await TextLessonModel.findByIdAndUpdate(
            itemId,
            updatedItemData,
            { new: true }
          );
          break;
        case "VideoLesson":
          updatedItem = await VideoLessonModel.findByIdAndUpdate(
            itemId,
            updatedItemData,
            { new: true }
          );
          break;
        case "AudioLesson":
          updatedItem = await AudioLessonModel.findByIdAndUpdate(
            itemId,
            updatedItemData,
            { new: true }
          );
          break;
        case "LiveLesson":
          updatedItem = await LiveLessonModel.findByIdAndUpdate(
            itemId,
            updatedItemData,
            { new: true }
          );
          break;
        default:
          return res.status(400).json({ message: "Invalid lesson type" });
      }
    } else if (itemType === "assignment") {
      updatedItem = await Assignment.findByIdAndUpdate(
        itemId,
        updatedItemData,
        {
          new: true,
        }
      );
    } else {
      return res.status(400).json({ message: "Invalid item type" });
    }

    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(updatedItem);
  } catch (error) {
    console.error("Lỗi khi cập nhật item:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa một item
export const deleteItem = async (req, res) => {
  try {
    const { slug, sectionId, itemId } = req.params;

    // Tìm course và section
    const course = await Course.findOne({ slug });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const section = course.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    // Tìm và xóa item từ section
    const itemIndex = section.items.findIndex((item) =>
      item.itemId.equals(itemId)
    );
    if (itemIndex === -1)
      return res.status(404).json({ message: "Item not found in section" });

    section.items.splice(itemIndex, 1);

    // Xóa item từ collection của nó
    await Lesson.findByIdAndDelete(itemId);
    await Assignment.findByIdAndDelete(itemId);

    await course.save();

    res.json({ message: "Item deleted successfully", course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Sắp xếp lại các item trong một section
export const reorderItemsInSection = async (req, res) => {
  try {
    const { slug, sectionId } = req.params;
    const { startIndex, endIndex } = req.body;

    const course = await Course.findOne({ slug });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const section = course.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    course.sections.items = moveArrayItem(section.items, startIndex, endIndex);

    await course.save();

    res.json(section.items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const enrollCourse = async (req, res) => {
  try {
    const { slug, userId } = req.params;

    // Find the course
    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already enrolled
    const existingEnrollment = user.enrolledCourses.find(
      (enrollment) => enrollment.courseId.toString() === course._id.toString()
    );
    if (existingEnrollment) {
      return res
        .status(400)
        .json({ message: "Already enrolled in this course" });
    }

    course.totalStudentsEnrolled++;
    await course.save();
    user.enrolledCourses.push({ courseId: course._id });
    await user.save();

    res.json({ message: "Successfully enrolled in course", course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update course progress (call this API when a lesson/assignment is completed)
export const updateCourseProgress = async (req, res) => {
  try {
    const { slug } = req.params;
    const { itemId, userId } = req.body;

    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const enrollment = user.enrolledCourses.find(
      (enrollment) => enrollment.courseId.toString() === course._id.toString()
    );
    if (!enrollment) {
      return res.status(400).json({ message: "Not enrolled in this course" });
    }

    // Add the completed item to the list
    if (!enrollment.completedItems.includes(itemId)) {
      enrollment.completedItems.push(itemId);
    }

    // Calculate progress
    const totalItems = course.sections.reduce(
      (total, section) => total + section.items.length,
      0
    );
    enrollment.progress = Math.round(
      (enrollment.completedItems.length / totalItems) * 100
    );
    enrollment.lastAccessed = new Date();

    await user.save();

    res.json({ message: "Progress updated", progress: enrollment.progress });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Hàm nộp bài kiểm tra
export const submitQuiz = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { userId, answers } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    // Tìm kết quả bài làm hiện tại của học sinh
    let assignmentResult = await AssignmentResult.findOne({
      assignment: assignmentId,
      student: userId,
    });

    // Tính điểm và tạo kết quả chi tiết
    let score = 0;
    const resultDetails = assignment.questions.map((question) => {
      // Tìm câu trả lời của người dùng trong mảng answers
      const userAnswerObject = answers.find(
        (answer) => answer.questionId === question._id.toString()
      );

      // Lấy các đáp án học sinh đã chọn từ userAnswerObject, nếu không tìm thấy thì trả về mảng rỗng
      const userAnswer = userAnswerObject
        ? userAnswerObject.selectedOptions.map((e) => e.userAnswer)
        : [];

      // Lấy các đáp án đúng trong csdl
      const correctOptions = question.options
        .filter((option) => option.isCorrect)
        .map((option) => option.text);

      // Kiểm tra đáp án của học sinh đúng hay sai
      const isCorrect =
        userAnswer.length === correctOptions.length &&
        userAnswer.every((answer) => correctOptions.includes(answer));

      if (isCorrect) {
        score++;
      }
      return {
        questionId: question._id,
        questionText: question.questionText,
        userAnswer,
        correctAnswer: correctOptions,
        isCorrect,
      };
    });
    console.log("----------resultDetails:", resultDetails);
    let check = "old";
    // Nếu đã có kết quả, cập nhật kết quả
    if (assignmentResult) {
      assignmentResult.answers = resultDetails.map((detail) => ({
        questionId: detail.questionId,
        selectedOptions: {
          userAnswer: detail.userAnswer,
          isCorrect: detail.isCorrect,
        },
      }));
      submittedAt: new Date(), (assignmentResult.score = score);
      console.log("-----------old assignmentResult:", assignmentResult);
      await assignmentResult.save();
    } else {
      // Nếu chưa có kết quả, tạo mới
      assignmentResult = new AssignmentResult({
        assignment: assignmentId,
        student: userId,
        answers: resultDetails.map((detail) => ({
          questionId: detail.questionId,
          selectedOptions: [
            {
              userAnswer: detail.userAnswer,
              isCorrect: detail.isCorrect,
            },
          ],
        })),
        submittedAt: new Date(),
        score,
      });
      check = "new";
      console.log("--------- new assignmentResult:", assignmentResult);
      await assignmentResult.save();
    }

    res.json({
      message: "Nộp bài thành công!",
      assignmentResult,
    });
  } catch (error) {
    console.error("Lỗi khi nộp bài tập:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cung cấp kết quả và thống kê cho giáo viên
export const getAllResultOfAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const results = await AssignmentResult.find({ assignment: assignmentId })
      .populate("student", "name email") // Lấy thông tin học sinh
      .sort({ submittedAt: -1 }); // Sắp xếp theo thời gian nộp

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy kết quả bài tập", error });
  }
};

// Hàm kiểm tra xem học sinh có được phép làm lại bài tập không
export const getUserAssignmentStatus = async (req, res) => {
  const assignmentId = req.params.assignmentId;
  const userId = req.params.userId;

  try {
    // Tìm kết quả bài làm của người dùng dựa trên userId và assignmentId
    const result = await AssignmentResult.findOne({
      assignment: assignmentId,
      student: userId,
    });
    console.log("result:", result);

    if (!result) {
      // Nếu không tìm thấy kết quả, người dùng chưa làm bài
      return res.json({ status: "not_started" });
    }

    // Nếu tìm thấy kết quả, kiểm tra xem có cho phép làm lại hay không
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }
    let totalScore = assignment.questions.length;
    console.log("totalScore:", totalScore);

    if (assignment.allowRetake) {
      // Nếu cho phép làm lại, trạng thái là 'can_retake'
      return res.json({ status: "can_retake", score: result.score });
    } else {
      // Nếu không cho phép làm lại, trạng thái là 'completed'
      return res.json({ status: "completed", score: result.score, totalScore });
    }
  } catch (error) {
    console.error("Error fetching assignment status:", error);
    res.status(500).json({ error: "Failed to fetch assignment status" });
  }
};

// Lấy kết quả bài kiểm tra cho học sinh
export const getStudentAssignmentResults = async (req, res) => {
  try {
    const { assignmentId, userId } = req.params;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }
    let totalScore = assignment.questions.length;

    const assignmentResult = await AssignmentResult.findOne({
      assignment: assignmentId,
      student: userId,
    }).populate("assignment");
    console.log(assignmentResult);

    if (!assignmentResult) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy kết quả bài làm." });
    }

    // Format kết quả
    const resultDetails = assignmentResult.assignment.questions.map(
      (question) => {
        // Lấy câu trả lời của người dùng từ assignmentResult.answers
        const userAnswerObject = assignmentResult.answers.find(
          (a) => a.questionId.toString() === question._id.toString()
        );

        // Lấy danh sách câu trả lời của người dùng, nếu không có thì trả về mảng rỗng
        const userAnswer = userAnswerObject
          ? userAnswerObject.selectedOptions.userAnswer // Access userAnswer directly
          : [];

        // Lấy danh sách đáp án đúng
        const correctOptions = question.options
          .filter((option) => option.isCorrect)
          .map((option) => option.text);

        return {
          questionText: question.questionText,
          userAnswer: userAnswer.join(", "), // Hiển thị câu trả lời của học sinh
          correctAnswer: correctOptions.join(", "), // Hiển thị đáp án đúng
          isCorrect: userAnswerObject
            ? userAnswerObject.selectedOptions.isCorrect
            : false,
          explanation: question.explanation, // Hiển thị explanation được lưu trong question
        };
      }
    );

    res.json({
      score: assignmentResult.score,
      answers: resultDetails,
      totalScore,
    });
  } catch (error) {
    console.error("Error fetching quiz result:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
};

// Lấy danh sách khóa học đã đăng ký của học sinh
export const getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Tìm người dùng và populate enrolledCourses với thông tin khóa học
    const user = await User.findById(userId).populate({
      path: "enrolledCourses.courseId",
      select:
        "name slug image_url summary avgRating updatedAt totalStudentsEnrolled", // Chọn các trường cần thiết từ khóa học
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const enrolledCourses = user.enrolledCourses.map((enrollment) => {
      // Kiểm tra enrollment.courseId trước khi truy cập _doc
      if (enrollment.courseId) {
        return {
          ...enrollment.courseId._doc, // Lấy dữ liệu từ courseId
          progress: enrollment.progress, // Thêm tiến độ học tập vào kết quả
          lastAccessed: enrollment.lastAccessed, // Thêm thời gian truy cập gần nhất
        };
      } else {
        // Xử lý trường hợp enrollment.courseId là null
        return null;
      }
    });
    const validEnrolledCourses = enrolledCourses.filter(
      (course) => course !== null
    );

    res.json(validEnrolledCourses);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách khóa học đã đăng ký:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy danh sách khóa học yêu thích của học sinh
export const getFavoriteCourses = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).populate({
      path: "favoriteCourses",
      select: "name slug image_url", // Chọn các trường cần thiết từ khóa học
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.json(user.favoriteCourses);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách khóa học yêu thích:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy danh sách khóa học được đề xuất cho học sinh (chưa có logic cụ thể)
export const getRecommendedCourses = async (req, res) => {
  try {
    const userId = req.params.userId;

    // **Logic đề xuất khóa học dựa trên userId (cần được triển khai)**
    // Ví dụ:
    // - Lấy danh sách khóa học thuộc chủ đề mà người dùng đã đăng ký
    // - Lấy danh sách khóa học phổ biến nhất
    // - Sử dụng thuật toán đề xuất (nếu có)

    // Giả sử bạn đã có logic và danh sách recommendedCourses
    const recommendedCourses = await Course.find({
      // ... (điều kiện tìm kiếm)
    }).select("name slug image_url");

    res.json(recommendedCourses);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách khóa học đề xuất:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Thêm khóa học vào danh sách yêu thích
export const addCourseToFavorites = async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    // Tìm người dùng
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Kiểm tra xem khóa học đã có trong danh sách yêu thích chưa
    if (user.favoriteCourses.includes(courseId)) {
      return res
        .status(400)
        .json({ message: "Khóa học đã có trong danh sách yêu thích" });
    }

    // Thêm khóa học vào danh sách yêu thích
    user.favoriteCourses.push(courseId);
    await user.save();

    res.json({
      message: "Đã thêm khóa học vào danh sách yêu thích",
      favoriteCourses: user.favoriteCourses,
    });
  } catch (error) {
    console.error("Lỗi khi thêm khóa học vào danh sách yêu thích:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa khóa học khỏi danh sách yêu thích
export const removeCourseFromFavorites = async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    // Tìm người dùng
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Kiểm tra xem khóa học có trong danh sách yêu thích không
    if (!user.favoriteCourses.includes(courseId)) {
      return res
        .status(400)
        .json({ message: "Khóa học không có trong danh sách yêu thích" });
    }

    // Xóa khóa học khỏi danh sách yêu thích
    user.favoriteCourses = user.favoriteCourses.filter(
      (id) => id.toString() !== courseId
    );
    await user.save();

    res.json({
      message: "Đã xóa khóa học khỏi danh sách yêu thích",
      favoriteCourses: user.favoriteCourses,
    });
  } catch (error) {
    console.error("Lỗi khi xóa khóa học khỏi danh sách yêu thích:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy danh sách học viên đã đăng ký khóa học
export const getEnrolledStudents = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Tìm danh sách enrollments của khóa học hiện tại
    const enrollments = await User.find(
      {
        "enrolledCourses.courseId": courseId,
      },
      {
        "enrolledCourses.$": 1, // Chỉ lấy enrollment có courseId trùng khớp
        username: 1,
        email: 1,
        thumbnail: 1,
      }
    ).lean(); // Trả về plain JavaScript object

    // Chuyển đổi dữ liệu để lấy progress từ enrollment và kiểm tra sự tồn tại của enrolledCourses
    const formattedStudents = enrollments.map((student) => ({
      _id: student._id,
      username: student.username,
      email: student.email,
      thumbnail: student.thumbnail,
      // Kiểm tra xem enrolledCourses có tồn tại không, và lấy progress nếu có
      progress:
        student.enrolledCourses && student.enrolledCourses[0]
          ? student.enrolledCourses[0].progress
          : 0,
    }));

    res.json(formattedStudents);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách học viên đã đăng ký:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
