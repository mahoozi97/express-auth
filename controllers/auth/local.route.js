const router = require("express").Router();
const User = require("../../models/User");
const verifyToken = require("../../middleware/verifyToken");
const validator = require("validator");
const bcrypt = require("bcrypt");
const sendEmailVerification = require("../../utils/mailer");
const authLimiter = require("../../middleware/limiter");

// - - - - - - - - - - - - - SIGN UP / SIGN IN - - - - - - - - - - - - - -

router.post("/sign-up", authLimiter, async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const foundUser = await User.findOne({ email });

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
    res.status(500).json({ error: error.message });
  }
});

router.post("/sign-in", authLimiter, async (req, res) => {
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

    const validPassword = await bcrypt.compare(password, foundUser.password);

    if (!validPassword) {
      return res.status(401).json({ error: "email or password incorrect" });
    }

    if (foundUser.is2FAEnabled) {
      const tempToken = foundUser.generateToken("5m", "2fa");

      return res.status(200).json({
        requires2FA: true,
        message: "Please submit your 6-digit code.",
        tempToken: tempToken,
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

module.exports = router;