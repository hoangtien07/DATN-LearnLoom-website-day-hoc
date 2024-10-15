import Comment from "../models/Comments.js";

// Lấy danh sách bình luận cho bài học hoặc bài tập
export const getComments = async (req, res) => {
  const { itemType, itemId } = req.params;

  try {
    const comments = await Comment.find({ [itemType]: itemId }).populate(
      "author"
    );
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: "Không thể lấy bình luận", error });
  }
};

// Thêm bình luận mới
export const addComment = async (req, res) => {
  const { itemType, itemId, userId } = req.params;
  const { content } = req.body;

  try {
    const newComment = new Comment({
      content,
      author: userId,
      [itemType]: itemId, // Thêm vào trường tương ứng: lesson hoặc assignment
      course: req.body.courseId, // Thêm tham chiếu tới khóa học
    });

    await newComment.save();
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: "Không thể thêm bình luận", error });
  }
};

// Cập nhật bình luận
export const updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  try {
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { content },
      { new: true }
    );

    if (!updatedComment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    res.status(200).json(updatedComment);
  } catch (error) {
    res.status(500).json({ message: "Không thể cập nhật bình luận", error });
  }
};

// Xóa bình luận
export const deleteComment = async (req, res) => {
  const { commentId } = req.params;

  try {
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    res.status(200).json({ message: "Bình luận đã được xóa" });
  } catch (error) {
    res.status(500).json({ message: "Không thể xóa bình luận", error });
  }
};
