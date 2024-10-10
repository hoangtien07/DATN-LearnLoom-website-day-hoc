import Lesson from "../models/Lesson.js";
import Course from "../models/Course.js";

// Get all lessons
export const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find().populate("course");
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get lesson by ID
export const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate("course");
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new lesson
export const createLesson = async (req, res) => {
  try {
    const { name, videoLink, courseId } = req.body;
    const newLesson = new Lesson({
      name,
      videoLink,
      course: courseId,
    });
    const savedLesson = await newLesson.save();

    // Add the lesson to the course's content
    await Course.findByIdAndUpdate(courseId, {
      $push: { content: savedLesson._id },
    });

    res.status(201).json(savedLesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a lesson
export const updateLesson = async (req, res) => {
  try {
    const { name, videoLink } = req.body;
    const updatedLesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      {
        name,
        videoLink,
      },
      { new: true }
    );
    if (!updatedLesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    res.json(updatedLesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a lesson
export const deleteLesson = async (req, res) => {
  try {
    const deletedLesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!deletedLesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Remove the lesson from the course's content
    await Course.findByIdAndUpdate(deletedLesson.course, {
      $pull: { content: deletedLesson._id },
    });

    res.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
