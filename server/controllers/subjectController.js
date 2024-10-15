// controllers/subjectController.js
import Subject from "../models/Subject.js";

// Lấy tất cả các môn học
export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subjects", error });
  }
};

// Tạo một môn học mới
export const createSubject = async (req, res) => {
  const { name } = req.body;

  try {
    const newSubject = new Subject({ name });
    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (error) {
    res.status(500).json({ message: "Error creating subject", error });
  }
};

// Cập nhật một môn học
export const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { name },
      { new: true } // Trả về phiên bản mới của tài liệu
    );

    if (!updatedSubject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.status(200).json(updatedSubject);
  } catch (error) {
    res.status(500).json({ message: "Error updating subject", error });
  }
};

// Xóa một môn học
export const deleteSubject = async (req, res) => {
  const { id } = req.params;

  try {
    await Subject.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Error deleting subject", error });
  }
};
