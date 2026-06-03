const rateLimit = require("express-rate-limit");

const authLimiter = () => {
  return rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3, // 3 requests
    message: {
      status: 429,
      error: "Too many requests. Please try again in 10 minutes.",
    },
  });
};

module.exports = authLimiter;
