import { writable } from "svelte/store";
import axios from "axios";
import { getApiBaseUrl } from "../lib/js/api";

// Create a writable store for user
export const user = writable(null);

const authClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

export const fetchUser = async () => {
  try {
    const response = await authClient.get("/auth/current_user");
    user.set(response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status !== 401) {
      console.error("Error fetching user:", error);
    }
    user.set(null);
    return null;
  }
};
