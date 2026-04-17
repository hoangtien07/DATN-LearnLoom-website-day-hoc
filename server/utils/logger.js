// Logger tối giản, tương thích API kiểu pino (info/warn/error/debug).
// Không phụ thuộc thư viện ngoài để tránh thêm dep; có thể thay bằng pino sau.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

const currentLevel =
  LEVELS[(process.env.LOG_LEVEL || "info").toLowerCase()] ?? LEVELS.info;

const serializeError = (err) => {
  if (!err || typeof err !== "object") return err;
  return {
    message: err.message,
    name: err.name,
    code: err.code,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  };
};

const emit = (level, levelValue, ...args) => {
  if (levelValue < currentLevel) return;

  let payload = {};
  let msg = "";

  if (args.length === 1) {
    if (typeof args[0] === "string") {
      msg = args[0];
    } else {
      payload = args[0] || {};
    }
  } else if (args.length >= 2) {
    payload = args[0] || {};
    msg = typeof args[1] === "string" ? args[1] : "";
  }

  if (payload.err) {
    payload.err = serializeError(payload.err);
  }

  const entry = {
    time: new Date().toISOString(),
    level,
    msg,
    ...payload,
  };

  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
};

const logger = {
  debug: (...args) => emit("debug", LEVELS.debug, ...args),
  info: (...args) => emit("info", LEVELS.info, ...args),
  warn: (...args) => emit("warn", LEVELS.warn, ...args),
  error: (...args) => emit("error", LEVELS.error, ...args),
};

export default logger;
