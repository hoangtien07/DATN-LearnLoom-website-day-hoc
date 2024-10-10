// frontend/src/lib/js/api.js
import axios from "axios";

// Tạo instance của axios với baseURL
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

export const fetchCourses = async () => {
  try {
    const response = await apiClient.get("/api/courses");
    console.log(response.data);

    return response.data;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};

export const fetchCourseBySlug = async (slug) => {
  try {
    const response = await apiClient.get(`/api/courses/${slug}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching course with slug ${slug}:`, error);
    throw error;
  }
};

export const createCourse = async (course) => {
  try {
    const response = await apiClient.post("/api/courses", course);
    console.log(result.response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
};

export const updateCourse = async (id, course) => {
  try {
    const response = await apiClient.put(`/api/courses/${id}`, course);
    return response.data;
  } catch (error) {
    console.error(`Error updating course with id ${id}:`, error);
    throw error;
  }
};

export const deleteCourse = async (id) => {
  try {
    const response = await apiClient.delete(`/api/courses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting course with id ${id}:`, error);
    throw error;
  }
};

// Login Google
export const loginWithGoogle = () => {
  window.location.href = "http://localhost:5000/auth/google";
};

export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get("/auth/current_user");
    return response.data;
  } catch (error) {
    console.error("Error fetching current user:", error);
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
