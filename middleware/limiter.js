const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const Redis = require("ioredis");
const USE_REDIS = process.env.USE_REDIS;

let redisClient;

if (USE_REDIS === "True") {
  redisClient = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
  redisClient.on("error", (err) => {
    console.error("❌ Redis Error (limiter):", err.message);
  });
}

const authLimiter = (customMax = 3) => {
  const limiterOptions = {
    windowMs: 10 * 60 * 1000,
    max: customMax,
    message: {
      status: 429,
      error: "Too many requests. Please try again in 10 minutes.",
    },
  };

  if (USE_REDIS === "True") {
    limiterOptions.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    });
    return rateLimit(limiterOptions);
  } else {
    return rateLimit(limiterOptions);
  }
};

module.exports = authLimiter;
