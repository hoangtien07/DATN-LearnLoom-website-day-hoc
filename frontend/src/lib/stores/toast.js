// Toast store — quản lý thông báo UX thay cho alert() native.
// Usage:
//   import { pushToast } from "$lib/stores/toast";
//   pushToast("Đã lưu", { variant: "success" });
import { writable } from "svelte/store";

let nextId = 1;
export const toasts = writable([]);

export const pushToast = (message, options = {}) => {
  const {
    variant = "info", // info | success | warn | error
    durationMs = 4000,
  } = options;
  const id = nextId++;
  toasts.update((list) => [...list, { id, message, variant }]);
  if (durationMs > 0) {
    setTimeout(() => dismissToast(id), durationMs);
  }
  return id;
};

export const dismissToast = (id) => {
  toasts.update((list) => list.filter((t) => t.id !== id));
};
