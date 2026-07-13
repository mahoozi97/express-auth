const router = require("express").Router();
const User = require("../../models/User");
const verifyToken = require("../../middleware/verifyToken");
const authLimiter = require("../../middleware/limiter");
const jwt = require("jsonwebtoken");

const { generateSecret, generateURI, verify } = require("otplib");
const QRCode = require("qrcode");
const { encryptSecret, decryptSecret } = require("../../utils/helper");
const {
  send2FaResetEmail,
  send2FaDisabledEmail,
  send2FaEnabledEmail,
} = require("../../utils/mailer");

//  - - - - - - - -  - - - -- - 2FA AUTHENTICATION - - - - - - - - -  -- - - - - -

router.post("/2fa/generate", verifyToken, authLimiter(), async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.sharedKey && user.is2FaEnabled) {
      return res
        .status(400)
        .json({ error: "2FA is already configured for this user." });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({ error: "2FA is managed by Google." });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error:
          "Please verify your email before enabling Two-Factor Authentication",
      });
    }

    // 1. Generate the raw secret
    const secretKey = generateSecret();
    user.sharedKey = encryptSecret(secretKey);
    await user.save();

    // Generate a QR code for the secret
    const otpauth = generateURI({
      label: user.email,
      issuer: "express-auth app",
      secret: secretKey,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    console.log("✅ 2FA generated successfully");
    res.status(200).json({ qrCodeUrl, secretKey });
  } catch (error) {
    console.log("❌ Generate 2FA falied: ", error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/2fa/verify-setup",
  verifyToken,
  authLimiter(),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const code = req.body.code;

      if (!code || code.length !== 6) {
        return res
          .status(400)
          .json({ error: "Please enter a valid 6-digit passcode" });
      }
      const user = await User.findById(userId).select("-password");

      if (!user || !user.sharedKey) {
        return res.status(400).json({ error: "2FA generation required first" });
      }

      if (user.is2FaEnabled) {
        return res.status(400).json({ error: "2FA already enabled" });
      }

      // Decrypt the secret from the database
      const decryptedSecret = decryptSecret(user.sharedKey);

      // Validate the 6-digit code against the decrypted secret
      const result = await verify({ secret: decryptedSecret, token: code });

      if (!result.valid) {
        return res.status(400).json({ error: "Invalid 2FA code" });
      }

      user.is2FaEnabled = true;
      await user.save();

      send2FaEnabledEmail(user.email, user.role);

      // refresh token
      const token = user.generateToken();
      console.log("✅ 2FA successfully enabled!");
      res
        .status(200)
        .json({ token: token, message: "2FA successfully enabled!" });
    } catch (error) {
      console.log("❌ Failed to enable 2FA: ", error);
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/2fa/verify-login",
  verifyToken,
  authLimiter(),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const code = req.body.code;

      if (!code || code.length !== 6) {
        return res
          .status(400)
          .json({ error: "Please enter a valid 6-digit passcode" });
      }

      const user = await User.findById(userId).select("-password");

      if (!user || !user.sharedKey) {
        return res.status(400).json({ error: "2FA generation required first" });
      }
      // Decrypt the secret from the database
      const decryptedSecret = decryptSecret(user.sharedKey);

      // Validate the 6-digit code against the decrypted secret
      const result = await verify({ secret: decryptedSecret, token: code });

      if (!result.valid) {
        return res.status(400).json({ error: "Invalid 2FA code" });
      }

      // refresh token
      const token = user.generateToken();

      console.log("✅ 2FA verified successfully");
      res.status(200).json({ token, message: "Code verified successfully!" });
    } catch (error) {
      console.log("❌ 2FA verification failed: ", error);
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/2fa/verify-disable",
  verifyToken,
  authLimiter(),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const code = req.body.code;

      if (!code || code.length !== 6) {
        return res
          .status(400)
          .json({ error: "Please enter a valid 6-digit passcode" });
      }
      const user = await User.findById(userId).select("-password");

      if (!user || !user.sharedKey) {
        return res.status(400).json({ error: "2FA generation required first" });
      }

      if (!user.is2FaEnabled) {
        return res.status(400).json({ error: "2FA is already disabled." });
      }

      // Decrypt the secret from the database
      const decryptedSecret = decryptSecret(user.sharedKey);

      // Validate the 6-digit code against the decrypted secret
      const result = await verify({ secret: decryptedSecret, token: code });

      if (!result.valid) {
        return res.status(400).json({ error: "Invalid 2FA code" });
      }

      user.is2FaEnabled = false;
      user.sharedKey = null;
      await user.save();

      send2FaDisabledEmail(user.email);

      // refresh token
      const token = user.generateToken();

      console.log("✅ 2FA successfully disabled!");
      res.status(200).json({ token, message: "2FA successfully disabled!" });
    } catch (error) {
      console.log("❌ Failed to disable 2FA: ", error);
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/2fa/reset-request",
  verifyToken,
  authLimiter(),
  async (req, res) => {
    try {
      const userId = req.user._id;

      const user = await User.findById(userId).select("-password -sharedKey");

      if (!user) {
        return res.status(404).json({ error: "User no longer exists." });
      }

      if (!user.is2FaEnabled) {
        return res.status(400).json({
          error: "Two-Factor Authentication is not enabled for this account.",
        });
      }

      const token = user.generateToken("5m", "2fa-reset");
      send2FaResetEmail(user.email, token);

      console.log("✅ 2FA reset email sent");
      res
        .status(200)
        .json({ message: "A 2FA reset link has been sent to your email." });
    } catch (error) {
      console.log("❌ Failed to send 2FA reset email: ", error);
      res.status(500).json({ error: error.message });
    }
  },
);

router.post("/2fa/reset/:token", authLimiter(), async (req, res) => {
  try {
    const token = req.params.token;

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded._id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User no longer exists." });
    }

    if (!user.is2FaEnabled) {
      return res.status(400).json({
        error: "Two-Factor Authentication is not enabled for this account.",
      });
    }

    user.is2FaEnabled = false;
    user.sharedKey = "";
    await user.save();

    send2FaDisabledEmail(user.email);

    console.log("✅ 2FA reset successfully");
    res.json({
      success: true,
      message: "2FA has been reset successfully.",
    });
  } catch (error) {
    console.log("❌ Failed to reset 2FA: ", error);
    if (error.message === "jwt expired") {
      res
        .status(400)
        .json({ success: false, error: "Link is invalid or has expired." });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;
