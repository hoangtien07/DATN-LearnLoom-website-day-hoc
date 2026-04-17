// Validator helpers nhẹ, không dep. Tương đương một subset zod cơ bản.
import mongoose from "mongoose";

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export class ValidationError extends Error {
  constructor(issues) {
    super("Validation failed");
    this.name = "ValidationError";
    this.issues = issues;
  }
}

const rules = {
  string:
    ({ min = 0, max = Infinity, optional = false, pattern, trim = true } = {}) =>
    (value, path) => {
      if (value === undefined || value === null || value === "") {
        if (optional) return undefined;
        throw new ValidationError([{ path, message: "bắt buộc" }]);
      }
      if (typeof value !== "string") {
        throw new ValidationError([{ path, message: "phải là chuỗi" }]);
      }
      const normalized = trim ? value.trim() : value;
      if (normalized.length < min) {
        throw new ValidationError([{ path, message: `tối thiểu ${min} ký tự` }]);
      }
      if (normalized.length > max) {
        throw new ValidationError([{ path, message: `tối đa ${max} ký tự` }]);
      }
      if (pattern && !pattern.test(normalized)) {
        throw new ValidationError([{ path, message: "định dạng không hợp lệ" }]);
      }
      return normalized;
    },

  number:
    ({ min = -Infinity, max = Infinity, integer = false, optional = false } = {}) =>
    (value, path) => {
      if (value === undefined || value === null || value === "") {
        if (optional) return undefined;
        throw new ValidationError([{ path, message: "bắt buộc" }]);
      }
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw new ValidationError([{ path, message: "phải là số" }]);
      }
      if (integer && !Number.isInteger(num)) {
        throw new ValidationError([{ path, message: "phải là số nguyên" }]);
      }
      if (num < min) {
        throw new ValidationError([{ path, message: `tối thiểu ${min}` }]);
      }
      if (num > max) {
        throw new ValidationError([{ path, message: `tối đa ${max}` }]);
      }
      return num;
    },

  objectId:
    ({ optional = false } = {}) =>
    (value, path) => {
      if (!value) {
        if (optional) return undefined;
        throw new ValidationError([{ path, message: "bắt buộc" }]);
      }
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new ValidationError([{ path, message: "ObjectId không hợp lệ" }]);
      }
      return String(value);
    },

  enum:
    (values, { optional = false } = {}) =>
    (value, path) => {
      if (value === undefined || value === null || value === "") {
        if (optional) return undefined;
        throw new ValidationError([{ path, message: "bắt buộc" }]);
      }
      if (!values.includes(value)) {
        throw new ValidationError([
          { path, message: `phải là một trong: ${values.join(", ")}` },
        ]);
      }
      return value;
    },

  boolean:
    ({ optional = false } = {}) =>
    (value, path) => {
      if (value === undefined || value === null) {
        if (optional) return undefined;
        throw new ValidationError([{ path, message: "bắt buộc" }]);
      }
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      throw new ValidationError([{ path, message: "phải là boolean" }]);
    },
};

/**
 * Tạo middleware validate cho req.body theo schema.
 * schema dạng: { fieldName: rules.string({...}), ... }
 * Bỏ qua field không nằm trong schema (whitelist).
 */
export const validateBody = (schema) => (req, res, next) => {
  const issues = [];
  const sanitized = {};

  for (const [field, rule] of Object.entries(schema)) {
    try {
      const value = rule(req.body?.[field], field);
      if (value !== undefined) {
        sanitized[field] = value;
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        issues.push(...err.issues);
      } else {
        issues.push({ path: field, message: err.message });
      }
    }
  }

  if (issues.length > 0) {
    return res.status(400).json({
      message: "Dữ liệu đầu vào không hợp lệ",
      issues,
    });
  }

  req.validatedBody = sanitized;
  next();
};

export { rules };
