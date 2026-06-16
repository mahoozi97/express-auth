const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const NODE_ENV = process.env.NODE_ENV;

const verifyToken = (req, res, next) => {
  if (NODE_ENV === "development") {
    req.user = {
      _id: "69a0ba02e13c1ed2fd6d5b33",
      username: "dev",
      role: "admin",
    };
    return next();
  }

  const is2FaRoute =
    req.path.endsWith("/2fa/verify-login") ||
    req.path.endsWith("/2fa/reset-request");

  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access Denied. No token provided" });
  }

  jwt.verify(token, JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid credientials" });
    }

    if (user.purpose === "2fa" && !is2FaRoute) {
      return res.status(403).json({
        error: "Access Denied. Please complete your 2FA verification first.",
      });
    }

    if (user.purpose === "access" && is2FaRoute) {
      return res.status(400).json({
        error: "Already authenticated. 2FA not required.",
      });
    }

    // reject access tokens missing their role
    if (user.purpose === "access" && !user.role) {
      return res.status(403).json({ error: "Token incomplete." });
    }

    if (user.purpose !== "2fa" && user.purpose !== "access") {
      return res.status(403).json({ error: "Invalid token purpose." });
    }

    req.user = user;
    next();
  });
};

module.exports = verifyToken;
