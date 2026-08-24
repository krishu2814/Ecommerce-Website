module.exports = function correlationMiddleware(req, res, next) {
  const correlationId =
    req.headers["x-correlation-id"] ||
    `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  console.log(
    `[${correlationId}] [Notification Service] ${req.method} ${req.originalUrl || req.url}`,
  );

  next();
};
