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

  const is2FaRoute = req.path.endsWith("/2fa/verify-login");
  console.log(is2FaRoute);

  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied. No token provided" });
  }

  jwt.verify(token, JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid credientials" });
    }

    if (user.purpose === "2fa" && !is2FaRoute) {
      return res.status(403).json({
        message: "Access Denied. Please complete your 2FA verification first.",
      });
    }

    // reject temporrary tokens carrying a role
    if (user.purpose !== "access" && user.role) {
      return res.status(403).json({ message: "Token conflict." });
    }

    // reject access tokens missing their role
    if (user.purpose === "access" && !user.role) {
      return res.status(403).json({ message: "Token incomplete." });
    }

    req.user = user;
    next();
  });
};

module.exports = verifyToken;
