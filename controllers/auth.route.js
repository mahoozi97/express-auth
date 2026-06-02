const router = require("express").Router();
const User = require("../models/User");
const axios = require("axios");
const validator = require("validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const sendEmailVerification = require("../utils/mailer");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/verifyToken");
const authLimiter = require("../middleware/limiter");

const { generateSecret, generateURI } = require("otplib");
const QRCode = require("qrcode");
const { encryptSecret, decryptSecret } = require("../utils/helper");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_ACCESS_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_CALLBACK_URL = "http://localhost:3000/auth/google/callback";

const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// - - - - - - - - - - - - - GOOGLE OAuth - - - - - - - - - - - - - -

router.get("/google", async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString("hex");

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_CALLBACK_URL,
      access_type: "offline",
      response_type: "code",
      state: state,
      scope: GOOGLE_OAUTH_SCOPES.join(" "),
      prompt: "select_account",
    });

    res.redirect(`${GOOGLE_OAUTH_URL}?${params}`);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "Code is required" });

    // Pack the credentials neatly into one object
    const authData = {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    };

    // Exchange authorization code for access token in a clean, single line
    const { data: access_token_data } = await axios.post(
      GOOGLE_ACCESS_TOKEN_URL,
      new URLSearchParams(authData),
    );

    const { id_token } = access_token_data;

    // Verify id_token and get user info
    const { data: token_info_data } = await axios.get(
      `${GOOGLE_TOKEN_INFO_URL}?id_token=${id_token}`,
    );

    const { email, name } = token_info_data;

    let user = await User.findOne({ email }).select("-password");
    if (!user) {
      user = await User.create({ email, username: name });
      user.isVerified = true;
      await user.save();
    }

    const token = user.generateToken();
    res.status(200).json({ token });
  } catch (err) {
    // ✅ axios throws on non-2xx — error details are in err.response
    console.error(err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "OAuth callback failed",
      details: err.response?.data || err.message,
    });
  }
});

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

// Verify Email Address
router.post("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded._id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User no longer exists." });
    }

    user.isVerified = true;
    await user.save();

    console.log("✅ Email verified successfully!");
    res.json({ success: true, message: "Email verified successfully!" });
  } catch (error) {
    console.error("❌ Failed or jwt expired: ", error);
    res
      .status(400)
      .json({ success: false, error: "Link is invalid or has expired." });
  }
});

// Resend Verification Email
router.post(
  "/resend-verification",
  verifyToken,
  authLimiter,
  async (req, res) => {
    try {
      const userId = req.user._id;

      const foundUser = await User.findById(userId).select("-password");

      if (!foundUser) {
        return res.status(404).json({ error: "User no longer exists." });
      }

      if (foundUser.isVerified) {
        return res
          .status(400)
          .json({ error: "Your user is already verified." });
      }

      const token = foundUser.generateToken("10m", "email-verification");
      sendEmailVerification(foundUser.email, token);

      console.log("✅ Email verification sent successfully");
      res.status(200).json({ message: "Email verification sent successfully" });
    } catch (error) {
      console.log("❌ Send email verification failed: ", error);
      res.status(500).json({ error: error.message });
    }
  },
);

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
      const tempToken = foundUsergenerateToken("5m", "2fa_partial");

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

//  - - - - - - - -  - - - -- - 2FA AUTHENTICATION - - - - - - - - -  -- - - - - -

router.post("/2fa/generate", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 1. Generate the raw secret
    const secret = generateSecret();
    user.sharedSecret = encryptSecret(secret);
    await user.save();

    // 3. Generate a QR code for the secret
    const otpauth = generateURI({
      label: user.email,
      issuer: "express-auth app",
      secret: secret,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    console.log("✅ 2FA generated successfully")
    res.status(200).json({ qrCodeUrl });
  } catch (error) {
    console.log("❌ Generate 2FA falied: ", error);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;
