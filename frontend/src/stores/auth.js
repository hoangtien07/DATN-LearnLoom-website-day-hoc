import { writable } from "svelte/store";
import axios from "axios";

// Create a writable store for user
export const user = writable(null);

export const fetchUser = async () => {
  try {
    const response = await axios.get(
      "http://localhost:5000/auth/current_user",
      { withCredentials: true }
    );
    user.set(response.data);
  } catch (error) {
    console.error("Error fetching user:", error);
    user.set(null);
  }
};
