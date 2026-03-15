const prefersJson = (req) => {
  const acceptHeader = req.headers.accept || "";
  return (
    req.xhr ||
    acceptHeader.includes("application/json") ||
    req.originalUrl.startsWith("/api/") ||
    req.originalUrl.startsWith("/auth/current_user")
  );
};

export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  if (prefersJson(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.redirect("/auth/google");
};
export const checkRole = (role) => {
  return (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === role) {
      return next();
    }
    res.status(403).send("Bạn không có quyền truy cập.");
  };
};
