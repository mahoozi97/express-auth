const router = require("express").Router();
const User = require("../../models/User");
const verifyToken = require("../../middleware/verifyToken");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  sendEmailVerification,
  sendResetPasswordEmail,
  sendResetSuccessEmail,
} = require("../../utils/mailer");
const authLimiter = require("../../middleware/limiter");

// - - - - - - - - - - - - - SIGN UP / SIGN IN - - - - - - - - - - - - - -

// Regex to detect any Arabic characters
const containsArabic = (text) => /\p{Script=Arabic}/u.test(text);

router.post("/sign-up", authLimiter(), async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    if (containsArabic(username)) {
      return res.status(400).json({ error: "Username must be in English" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Please enter a password with at least 6 characters." });
    }

    const foundUser = await User.findOne({ email }).select(
      "-password -sharedKey",
    );

    if (foundUser) {
      return res.status(409).json({ error: "You already have an account." });
    }

    const createdUser = await User.create({ username, email, password });

    // email verification
    const token = createdUser.generateToken("10m", "email-verification");
    sendEmailVerification(createdUser.email, token);

    // change to object and delete the password
    const { password: _password, ...userObject } = createdUser.toObject();

    console.log("✅ Signed up successfully", userObject);
    res.status(201).json(userObject);
  } catch (error) {
    console.log("❌ Sign up failed. Please try again: ", error);
    if (error.code === 11000) {
      // 1st key & value of keyValue
      const [key, value] = Object.entries(error.keyValue)[0];
      return res.status(400).json({
        error: `${value} ${key} already taken`,
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

router.post("/sign-in", authLimiter(), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const foundUser = await User.findOne({ email: email });

    if (!foundUser) {
      return res.status(400).json({ error: "email or password incorrect" });
    }

    if (foundUser.authProvider !== "local") {
      return res.status(400).json({
        error: `This account was created using ${foundUser.authProvider}. Please sign in with ${foundUser.authProvider} instead.`,
        authProvider: foundUser.authProvider,
      });
    }

    const validPassword = await bcrypt.compare(password, foundUser.password);

    if (!validPassword) {
      return res.status(401).json({ error: "email or password incorrect" });
    }

    if (foundUser.is2FaEnabled) {
      const tempToken = foundUser.generateToken("5m", "2fa");

      return res.status(200).json({
        requires2FA: true,
        message: "Please submit your 6-digit code.",
        token: tempToken,
      });
    }

    const token = foundUser.generateToken();

    console.log("✅ Signed in successfully");
    res.status(200).json({ token });
  } catch (error) {
    console.log("❌ Sign in failed. Please try again: ", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/forgot-password", authLimiter(), async (req, res) => {
  try {
    const email = req.body.email;

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email" });
    }

    const foundUser = await User.findOne({ email }).select(
      "-password -sharedKey",
    );

    if (!foundUser) {
      return res.status(404).json({ error: "User not found!" });
    }

    if (foundUser.authProvider !== "local") {
      return res.status(400).json({
        error: `This account was created using ${foundUser.authProvider}. Please sign in with ${foundUser.authProvider} instead.`,
        authProvider: foundUser.authProvider,
      });
    }

    const token = foundUser.generateToken("5m", "password-reset");
    sendResetPasswordEmail(foundUser.email, token);

    console.log("✅ Password reset email sent successfully");
    res.status(200).json({
      success: true,
      message: "A password reset link has been sent to your email.",
    });
  } catch (error) {
    console.log("❌ Failed to send password reset email: ", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/reset-password/:token", authLimiter(), async (req, res) => {
  try {
    const token = req.params.token;

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const foundUser = await User.findById(decoded._id).select(
      "-password -sharedKey",
    );

    if (!foundUser) {
      return res.status(404).json({ error: "User no longer exists." });
    }

    const newToken = foundUser.generateToken("5m", "password-reset");

    console.log("✅ Reset token verified successfully");
    res.json({
      success: true,
      message:
        "Token verified successfully. You may now enter your new password.",
      token: newToken,
    });
  } catch (error) {
    console.error("❌ Failed to verify reset token: ", error);
    if (error.message === "jwt expired") {
      res
        .status(400)
        .json({ success: false, error: "Link is invalid or has expired." });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

router.post("/reset-password", authLimiter(), async (req, res) => {
  try {
    const token = req.body.token;
    const password = req.body.password;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Please enter a password with at least 6 characters." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const userId = decoded._id;

    const foundUser = await User.findById(userId).select("-sharedKey");

    if (!foundUser) {
      return res.status(404).json({ error: "User not found!" });
    }

    foundUser.password = password;
    await foundUser.save();

    sendResetSuccessEmail(foundUser.email);

    console.log("✅ Password updated successfully.");
    res.json({
      success: true,
      message: "Your password has been successfully reset.",
    });
  } catch (error) {
    console.error("❌ Failed to update password: ", error);
    if (error.message === "jwt expired") {
      res
        .status(400)
        .json({ success: false, error: "Temporary token has expired." });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;
