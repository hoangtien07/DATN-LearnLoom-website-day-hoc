// frontend/src/lib/js/api.js
import axios from "axios";

const FALLBACK_API_URL = "http://localhost:5000";

const normalizeBaseUrl = (value) => {
  if (!value) {
    return "";
  }

  return value.replace(/\/$/, "");
};

const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_URL || FALLBACK_API_URL,
);

// Tạo instance của axios với baseURL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const getApiBaseUrl = () => API_BASE_URL;

export const getAuthUrl = (path = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const getChatHistory = async ({
  sessionKey,
  courseId,
  lessonId,
  limit,
}) => {
  try {
    const response = await apiClient.get("/api/chat/history", {
      params: {
        sessionKey,
        courseId,
        lessonId,
        limit,
      },
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching chat history:", error);
    throw error;
  }
};

export const clearChatHistory = async ({ sessionKey, courseId, lessonId }) => {
  try {
    const response = await apiClient.delete("/api/chat/history", {
      data: {
        sessionKey,
        courseId,
        lessonId,
      },
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    console.error("Error clearing chat history:", error);
    throw error;
  }
};

export const deleteChatMessage = async ({ messageId, sessionKey }) => {
  try {
    const response = await apiClient.delete(`/api/chat/messages/${messageId}`, {
      data: {
        sessionKey,
      },
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    console.error("Error deleting chat message:", error);
    throw error;
  }
};

// Lấy toàn bộ khóa học
export const fetchCourses = async () => {
  try {
    const response = await apiClient.get("/api/courses");

    return response.data;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};

// Lấy khóa học bằng slug
export const fetchCourseBySlug = async (slug) => {
  try {
    const response = await apiClient.get(`/api/courses/${slug}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching course with slug ${slug}:`, error);
    throw error;
  }
};

// Backward-compatible helper for pages still using the older function name.
// Current backend contract fetches a course by slug.
export const fetchCourseById = async (courseIdOrParams) => {
  const slug =
    typeof courseIdOrParams === "string"
      ? courseIdOrParams
      : courseIdOrParams?.slug;

  if (!slug) {
    throw new Error("fetchCourseById requires a course slug");
  }

  return fetchCourseBySlug(slug);
};

// Lấy các khóa học đã tạo của giảng viên bằng instructorId
export const fetchCourseByInstructor = async (instructorId) => {
  try {
    const response = await apiClient.get(
      `/api/courses/instructor/${instructorId}`,
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching course by instructor with id ${instructorId}:`,
      error,
    );
    throw error;
  }
};

// Lấy khóa học theo bộ lọc
export async function fetchFilteredCourses(filters) {
  const { subjects, levels, durations, prices } = filters;
  const query = new URLSearchParams();

  const durationMap = {
    "Ít hơn 5 giờ": "0-5 giờ",
    "5-10 giờ": "5-10 giờ",
    "10-20 giờ": "10-20 giờ",
    "20-40 giờ": "20-40 giờ",
    "Hơn 40 giờ": "Hơn 40 giờ",
  };

  // Chỉ thêm vào query khi có giá trị
  if (subjects.length > 0) {
    query.append("subjects", subjects.join(","));
  }
  if (levels.length > 0) {
    query.append("levels", levels.join(","));
  }
  if (durations.length > 0) {
    const mappedDurations = durations.map((d) => durationMap[d] || d);
    query.append("durations", mappedDurations.join(","));
  }
  if (prices.length > 0) {
    query.append("prices", prices.join(","));
  }

  console.log(`/api/courses?${query.toString()}`);
  const response = await apiClient.get(`/api/courses?${query.toString()}`);
  return response.data;
}

// Tạo khóa học
export const createCourse = async (course) => {
  try {
    console.log(course);
    const response = await apiClient.post("/api/courses", course);
    return response.data;
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
};

// Sửa khóa học
export const updateCourse = async (slug, course) => {
  try {
    const response = await apiClient.put(`/api/courses/${slug}`, course);
    return response.data;
  } catch (error) {
    console.error(`Error updating course with slug ${slug}:`, error);
    throw error;
  }
};

// Xóa khóa học (soft delete)
export const deleteCourse = async (slug) => {
  try {
    const response = await apiClient.delete(`/api/courses/${slug}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting course with slug ${slug}:`, error);
    throw error;
  }
};

// Ẩn khóa học
export const hideCourse = async (slug) => {
  try {
    const response = await apiClient.put(`/api/courses/${slug}/hide`);
    return response.data;
  } catch (error) {
    console.error(`Error hiding course ${slug}:`, error);
    throw error;
  }
};

// Hiện lại khóa học
export const unhideCourse = async (slug) => {
  try {
    const response = await apiClient.put(`/api/courses/${slug}/unhide`);
    return response.data;
  } catch (error) {
    console.error(`Error unhiding course ${slug}:`, error);
    throw error;
  }
};

// Xuất bản khóa học
export const publishCourse = async (slug) => {
  try {
    const response = await apiClient.put(`/api/courses/${slug}/publish`);
    return response.data;
  } catch (error) {
    console.error(`Error publishing course ${slug}:`, error);
    throw error;
  }
};

// Hủy xuất bản khóa học (về bản nháp)
export const unpublishCourse = async (slug) => {
  try {
    const response = await apiClient.put(`/api/courses/${slug}/unpublish`);
    return response.data;
  } catch (error) {
    console.error(`Error unpublishing course ${slug}:`, error);
    throw error;
  }
};

// Lấy các khóa học đã ẩn của giảng viên
export const fetchHiddenCoursesByInstructor = async (instructorId) => {
  try {
    const response = await apiClient.get(
      `/api/courses/instructor/${instructorId}/hidden`,
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return [];
    console.error(`Error fetching hidden courses:`, error);
    throw error;
  }
};

// Admin: lấy danh sách khóa học bị xóa mềm
export const fetchDeletedCoursesAdmin = async () => {
  try {
    const response = await apiClient.get(`/api/courses/admin/deleted`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return [];
    console.error(`Error fetching deleted courses:`, error);
    throw error;
  }
};

// Admin: khôi phục khóa học bị xóa mềm
export const restoreDeletedCourse = async (slug) => {
  try {
    const response = await apiClient.put(`/api/courses/${slug}/restore`);
    return response.data;
  } catch (error) {
    console.error(`Error restoring course ${slug}:`, error);
    throw error;
  }
};

// Bật/tắt hiển thị bài học
export const toggleLessonVisibility = async (itemType, itemId) => {
  try {
    const response = await apiClient.put(
      `/api/courses/items/${itemType}/${itemId}/visibility`,
    );
    return response.data;
  } catch (error) {
    console.error(`Error toggling lesson visibility:`, error);
    throw error;
  }
};

// --- Section API functions ---

// Add a new section to a course
export const addSectionToCourse = async (slug, sectionData) => {
  try {
    const response = await apiClient.post(
      `/api/courses/${slug}/sections`,
      sectionData,
    );
    return response.data;
  } catch (error) {
    console.error("Error adding section:", error);
    throw error;
  }
};

// Get all sections of a course
export const getSectionsByCourseSlug = async (slug) => {
  try {
    const response = await apiClient.get(`/api/courses/${slug}/sections`);
    return response.data;
  } catch (error) {
    console.error("Error fetching sections:", error);
    throw error;
  }
};

export const updateSection = async (slug, sectionId, sectionData) => {
  try {
    const response = await apiClient.put(
      `/api/courses/${slug}/sections/${sectionId}`,
      sectionData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating section:", error);
    throw error;
  }
};

export const deleteSection = async (slug, sectionId) => {
  try {
    const response = await apiClient.delete(
      `/api/courses/${slug}/sections/${sectionId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting section:", error);
    throw error;
  }
};

// --- Item Functions ---

export const addItemToSection = async (slug, sectionId, itemData) => {
  console.log(`/api/courses/${slug}/sections/${sectionId}/items`, itemData);
  try {
    const response = await apiClient.post(
      `/api/courses/${slug}/sections/${sectionId}/items`,
      itemData,
    );
    return response.data;
  } catch (error) {
    console.error("Error adding item to section:", error);
    throw error;
  }
};

export const updateItem = async (itemType, itemId, updatedItemData) => {
  try {
    const response = await apiClient.put(
      `/api/courses/items/${itemType}/${itemId}`,
      updatedItemData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating item:", error);
    throw error;
  }
};

export const deleteItem = async (slug, sectionId, itemId) => {
  try {
    const response = await apiClient.delete(
      `/api/courses/${slug}/sections/${sectionId}/items/${itemId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting item:", error);
    throw error;
  }
};

// Get item by itemType and itemId
export const getItem = async (itemType, itemId) => {
  try {
    const response = await apiClient.get(
      `/api/courses/items/${itemType}/${itemId}`,
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${itemType} with ID ${itemId}:`, error);
    throw error;
  }
};

// --- Reordering Functions ---

export const reorderSections = async (slug, startIndex, endIndex) => {
  try {
    const response = await apiClient.put(
      `/api/courses/${slug}/sections/reorder`,
      {
        startIndex,
        endIndex,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error reordering sections:", error);
    throw error;
  }
};

export const reorderItemsInSection = async (slug, sectionId, newOrder) => {
  try {
    const response = await apiClient.put(
      `/api/courses/${slug}/sections/${sectionId}/reorder`,
      {
        newOrder,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error reordering items in section:", error);
    throw error;
  }
};

// Sử dụng apiClient để lấy session
export const getSession = async (request) => {
  try {
    const response = await apiClient.get("/auth/current_user", {
      headers: {
        Cookie: request.headers.get("cookie"),
      },
    });
    return { user: response.data };
  } catch (error) {
    console.error("Error fetching session:", error);
    return { user: null };
  }
};

// Enroll in a course
export const enrollCourse = async (slug, userId) => {
  try {
    console.log(slug, userId);
    const response = await apiClient.post(
      `/api/courses/${slug}/${userId}/enroll`,
    );
    return response.data;
  } catch (error) {
    console.error("Error enrolling in course:", error);
    throw error;
  }
};

// Update course progress
export const updateCourseProgress = async (slug, itemId, userId) => {
  try {
    const response = await apiClient.put(`/api/courses/${slug}/progress`, {
      itemId,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating progress:", error);
    throw error;
  }
};

// --- Comment

// Lấy danh sách bình luận
export const getComments = async (itemType, itemId) => {
  try {
    const response = await apiClient.get(`/api/comments/${itemType}/${itemId}`);
    return response.data; // Trả về danh sách các bình luận
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
};

//  Thêm bình luận mới
export const addComment = async (
  itemType,
  itemId,
  userId,
  content,
  courseId,
) => {
  console.log(`/api/comments/${itemType}/${itemId}/${userId}`, {
    content,
    courseId,
  });
  try {
    const response = await apiClient.post(
      `/api/comments/${itemType}/${itemId}/${userId}`,
      {
        content,
        courseId,
      },
    );
    console.log(response.data);
    return response.data; // Trả về bình luận mới tạo
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

// Cập nhật bình luận
export const updateComment = async (commentId, newContent) => {
  try {
    const response = await apiClient.put(`/api/comments/${commentId}`, {
      content: newContent,
    });
    return response.data; // Trả về bình luận đã cập nhật
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  }
};

// Xóa bình luận
export const deleteComment = async (commentId) => {
  try {
    const response = await apiClient.delete(`/api/comments/${commentId}`);
    return response.data; // Trả về thông báo thành công
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
};

// ---------------- Bài tập

// Lấy trạng thái của bài tập
export const getUserAssignmentStatus = async (userId, assignmentId) => {
  try {
    console.log(`/api/courses/assignments/${assignmentId}/${userId}/status`);
    const response = await apiClient.get(
      `/api/courses/assignments/${assignmentId}/user/${userId}/status`,
    );
    return response.data; // Trả về trạng thái của bài tập (ví dụ: "not_started", "completed", "can_retake")
  } catch (error) {
    console.error("Error fetching user assignment status:", error);
    throw error; // Ném lỗi lên để xử lý ở component
  }
};

// Nộp bài
export const submitQuiz = async (assignmentId, userId, answers) => {
  try {
    console.log(assignmentId, answers);
    // Format answers correctly before sending
    const formattedAnswers = Object.entries(answers).map(
      ([questionId, selectedOptions]) => ({
        questionId,
        selectedOptions: selectedOptions.map((optionText) => ({
          userAnswer: optionText, // Text của câu trả lời
          isCorrect: false, // Backend sẽ xử lý xem câu trả lời có đúng hay không
        })),
      }),
    );

    console.log("forrmat: ", formattedAnswers);

    const response = await apiClient.post(
      `/api/courses/assignments/${assignmentId}/submit`,
      {
        userId,
        answers: formattedAnswers,
      },
    );

    return response.data;
  } catch (error) {
    console.error("Lỗi khi gửi bài tập:", error);
    throw error;
  }
};

// Lấy dữ liệu từ bài tập đã hoàn thành
export const getQuizResult = async (assignmentId, userId) => {
  try {
    const response = await apiClient.get(
      `/api/courses/assignments/${assignmentId}/user/${userId}/student-results`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching quiz result:", error);
    throw error; // Re-throw to handle the error in your component
  }
};

// ---------- Review

// Lấy danh sách đánh giá cho khóa học
export const getReviews = async (courseId) => {
  try {
    const response = await apiClient.get(`/api/reviews/${courseId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw error;
  }
};

// Tạo đánh giá mới
export const addReview = async (courseId, userId, reviewData) => {
  try {
    const response = await apiClient.post(
      `/api/reviews/${courseId}/${userId}`,
      reviewData,
    );
    return response.data;
  } catch (error) {
    console.error("Error creating review:", error);
    throw error;
  }
};

// Cập nhật đánh giá
export const updateReview = async (reviewId, reviewData) => {
  try {
    const response = await apiClient.put(
      `/api/reviews/${reviewId}`,
      reviewData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating review:", error);
    throw error;
  }
};

// Xóa đánh giá
export const deleteReview = async (reviewId) => {
  try {
    const response = await apiClient.delete(`/api/reviews/${reviewId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
};

// ------------ Admin

// Lấy danh sách người dùng
export const getUsers = async () => {
  try {
    const response = await apiClient.get("/api/users");
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

// Cập nhật người dùng
export const updateUser = async (userId, userData) => {
  try {
    const response = await apiClient.put(`/api/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// Xóa người dùng
export const deleteUser = async (userId) => {
  try {
    const response = await apiClient.delete(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Tạo giao dịch
export const createOrder = async (req, res) => {
  try {
    const data = {
      courseId: req.courseId,
      redirectUrl: req.redirectUrl,
    };
    console.log(data);
    const response = await apiClient.post(`/api/orders/create`, data);
    return response.data;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

export const createVnpayPaymentUrl = async (orderId) => {
  try {
    const response = await apiClient.post(
      `/api/orders/payment/create-vnpay-url`,
      {
        orderId,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error creating VNPay payment URL:", error);
    throw error;
  }
};

export const getOrderPaymentStatus = async (orderId) => {
  try {
    const response = await apiClient.get(
      `/api/orders/payment/status/${orderId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching order payment status:", error);
    throw error;
  }
};

// Update order
export const updateOrder = async (userId, courseId, transactionId) => {
  try {
    const response = await apiClient.put(
      `/api/orders/${userId}/${courseId}/${transactionId}`,
    );

    return response.data; // Trả về order đã được cập nhật từ backend
  } catch (error) {
    console.error("Error updating order:", error);
    throw error; // Ném lỗi để xử lý ở nơi gọi hàm
  }
};

// Lấy các giao dịch
export const getOrder = async () => {
  try {
    const response = await apiClient.get(`/api/orders/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching order:", error);
    throw error;
  }
};

// API cho Subject
export const getSubjects = async () => {
  try {
    const response = await apiClient.get("/api/subjects");
    return response.data;
  } catch (error) {
    console.error("Error fetching subjects:", error);
    throw error;
  }
};

export const createSubject = async (subjectData) => {
  try {
    const response = await apiClient.post("/api/subjects", subjectData);
    return response.data;
  } catch (error) {
    console.error("Error creating subject:", error);
    throw error;
  }
};

export const updateSubject = async (subjectId, subjectData) => {
  try {
    const response = await apiClient.put(
      `/api/subjects/${subjectId}`,
      subjectData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating subject:", error);
    throw error;
  }
};

export const deleteSubject = async (subjectId) => {
  try {
    const response = await apiClient.delete(`/api/subjects/${subjectId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting subject:", error);
    throw error;
  }
};

// Lấy danh sách khóa học theo điều kiện
// Khóa học đã tham gia
export const getEnrolledCourses = async (userId) => {
  try {
    const response = await apiClient.get(`/api/courses/enrolled/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    throw error; // Ném lỗi để xử lý ở component gọi hàm
  }
};

// Khóa học yêu thích
export const getFavoriteCourses = async (userId) => {
  try {
    const response = await apiClient.get(`/api/courses/favorites/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching favorite courses:", error);
    throw error;
  }
};

// Khóa học gợi ý
export const getRecommendedCourses = async (userId) => {
  try {
    const response = await apiClient.get(
      `/api/courses/recommendations/${userId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching recommended courses:", error);
    throw error;
  }
};

// Thêm khóa học vào danh sách yêu thích
export const addCourseToFavorites = async (courseId, userId) => {
  try {
    const response = await apiClient.post(
      `/api/courses/favorite/${courseId}/${userId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi khi thêm khóa học vào danh sách yêu thích:", error);
    throw error;
  }
};

// Xóa khóa học khỏi danh sách yêu thích
export const removeCourseFromFavorites = async (courseId, userId) => {
  try {
    const response = await apiClient.delete(
      `/api/courses/favorite/${courseId}/${userId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi khi xóa khóa học khỏi danh sách yêu thích:", error);
    throw error;
  }
};

// Lấy danh sách học viên đã đăng ký khóa học
export const getEnrolledStudents = async (courseId) => {
  try {
    const response = await apiClient.get(
      `/api/courses/enrolled-students/${courseId}`,
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching enrolled students for course ${courseId}:`,
      error,
    );
    throw error;
  }
};

// Lấy danh sách hóa đơn theo teacherId
export const getOrdersByTeacher = async (teacherId) => {
  try {
    const response = await apiClient.get(`/api/orders/teacher/${teacherId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching orders for teacher ${teacherId}:`, error);
    throw error;
  }
};
