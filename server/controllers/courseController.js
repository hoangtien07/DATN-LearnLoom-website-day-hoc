// server/controllers/courseController.js
import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";
import Assignment from "../models/Assignments.js";
import User from "../models/User.js";

// Create a new course
// export const createCourse = async (req, res) => {
//   try {
//     const course = new Course(req.body);
//     console.log(course);
//     await course.save();
//     res.status(201).json(course);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
export const createCourse = async (req, res) => {
  try {
    const {
      name,
      description,
      teacher,
      overviewVideo,
      level,
      totalLessons,
      totalDuration,
      slug,
      // totalStudentsEnrolled,
      visible,
      image_url,
      price,
      old_price,
      is_pro,
      is_published,
      is_selling,
      // progress,
      published_at,
      // chapters,
      // reviews,
    } = req.body;

    // Kiểm tra giáo viên có tồn tại
    const teacherExists = await User.findById(teacher);
    if (!teacherExists) {
      return res.status(400).json({ message: "Teacher not found" });
    }

    const course = new Course({
      name,
      description,
      teacher: teacherExists,
      overviewVideo,
      level,
      totalLessons,
      totalDuration,
      slug,
      // totalStudentsEnrolled,
      visible,
      image_url,
      price,
      old_price,
      is_pro,
      is_published,
      is_selling,
      // progress,
      published_at,
      // chapters,
      // reviews,
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
    const course = await Course.findBySlugAndUpdate(req.params.slug, req.body, {
      new: true,
    });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a course
export const deleteCourse = async (req, res) => {
  try {
    await Course.findByIdAndUpdate(req.params.id, { visible: false });
    res.json({ message: "Course moved to trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get course by ID
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate("lessons");
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all courses
export const getCourses = async (req, res) => {
  try {
    // const courses = await Course.find({ visible: true }).populate("lessons");
    const courses = await Course.find({ visible: true }).populate("teacher");
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Thêm một chương mới vào khóa học
export const addChapter = async (req, res) => {
  try {
    const { courseId, name } = req.body;

    const course = await Course.findById(courseId);
    if (!course)
      return res.status(404).json({ message: "Khóa học không tồn tại" });

    const newChapter = { name, lessons: [], assignments: [] };
    course.chapters.push(newChapter);
    await course.save();

    res.status(201).json(course.chapters[course.chapters.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy tất cả các chương của một khóa học
export const getChaptersByCourseId = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate(
      "chapters.lessons chapters.assignments"
    );
    if (!course)
      return res.status(404).json({ message: "Khóa học không tồn tại" });

    res.json(course.chapters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật một chương
export const updateChapter = async (req, res) => {
  try {
    const { courseId, chapterIndex, name } = req.body;

    const course = await Course.findById(courseId);
    if (!course)
      return res.status(404).json({ message: "Khóa học không tồn tại" });

    course.chapters[chapterIndex].name = name;
    await course.save();

    res.json(course.chapters[chapterIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa một chương khỏi khóa học
export const deleteChapter = async (req, res) => {
  try {
    const { courseId, chapterIndex } = req.params;

    const course = await Course.findById(courseId);
    if (!course)
      return res.status(404).json({ message: "Khóa học không tồn tại" });

    course.chapters.splice(chapterIndex, 1);
    await course.save();

    res.json({ message: "Chương đã được xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new lesson for a course
export const createLesson = async (req, res) => {
  try {
    const lesson = new Lesson(req.body);
    await lesson.save();
    await Course.findByIdAndUpdate(req.params.courseId, {
      $push: { lessons: lesson._id },
    });
    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific lesson by ID
export const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a lesson in a course
export const updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.lessonId,
      req.body,
      { new: true }
    );
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a lesson from a course
export const deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    await Course.findByIdAndUpdate(lesson.course, {
      $pull: { lessons: lesson._id },
    });
    res.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new assignment for a lesson
export const createAssignment = async (req, res) => {
  try {
    const assignment = new Assignment(req.body);
    await assignment.save();
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific assignment by ID
export const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found" });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an assignment for a lesson
export const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.assignmentId,
      req.body,
      { new: true }
    );
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete an assignment from a lesson
export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(
      req.params.assignmentId
    );
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found" });

    await Lesson.findByIdAndUpdate(assignment.lesson, {
      $pull: { assignments: assignment._id },
    });
    res.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
