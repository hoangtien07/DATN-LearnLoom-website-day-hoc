// Confirm dialog store — dùng Promise-based API thay cho window.confirm().
// Usage:
//   import { confirm } from "$lib/stores/confirm";
//   const ok = await confirm({ title: "Xóa khóa học", message: "Bạn chắc chắn?", confirmLabel: "Xóa", variant: "danger" });
//   if (ok) { ... }
import { writable } from "svelte/store";

export const confirmState = writable(null);

export const confirm = (options) =>
  new Promise((resolve) => {
    confirmState.set({
      title: options.title || "Xác nhận",
      message: options.message || "Bạn có chắc chắn muốn tiếp tục?",
      confirmLabel: options.confirmLabel || "Xác nhận",
      cancelLabel: options.cancelLabel || "Hủy",
      variant: options.variant || "primary", // primary | danger
      resolve,
    });
  });

export const resolveConfirm = (result) => {
  confirmState.update((s) => {
    if (s) s.resolve(result);
    return null;
  });
};
