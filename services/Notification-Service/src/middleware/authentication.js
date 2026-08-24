const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/serverConfig");

module.exports = function authenticationMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        data: {},
        message: "Authorization token missing",
        error: "Unauthorized",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      data: {},
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};
