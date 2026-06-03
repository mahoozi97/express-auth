const router = require("express").Router();
const User = require("../../models/User");
const verifyToken = require("../../middleware/verifyToken");
// const authLimiter = require("../../middleware/limiter");

const { generateSecret, generateURI, verify } = require("otplib");
const QRCode = require("qrcode");
const { encryptSecret, decryptSecret } = require("../../utils/helper");

//  - - - - - - - -  - - - -- - 2FA AUTHENTICATION - - - - - - - - -  -- - - - - -

router.post("/2fa/generate", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
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
    const secret = generateSecret();
    user.sharedSecret = encryptSecret(secret);
    await user.save();

    // Generate a QR code for the secret
    const otpauth = generateURI({
      label: user.email,
      issuer: "express-auth app",
      secret: secret,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    console.log("✅ 2FA generated successfully");
    res.status(200).json({ qrCodeUrl });
  } catch (error) {
    console.log("❌ Generate 2FA falied: ", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/2fa/verify-setup", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { passcode } = req.body;

    if (!passcode || passcode.length !== 6) {
      return res
        .status(400)
        .json({ error: "Please enter a valid 6-digit passcode" });
    }
    const user = await User.findById(userId).select("-password");

    if (!user || !user.sharedSecret) {
      return res.status(400).json({ error: "2FA generation required first" });
    }

    if (user.is2FAEnabled) {
      return res.status(400).json({ error: "2FA already enabled" });
    }

    // Decrypt the secret from the database
    const decryptedSecret = decryptSecret(user.sharedSecret);

    // Validate the 6-digit code against the decrypted secret
    const result = await verify({ secret: decryptedSecret, token: passcode });

    if (!result.valid) {
      return res.status(400).json({ error: "Invalid 2FA code" });
    }

    user.is2FAEnabled = true;
    await user.save();
    console.log("✅ 2FA successfully enabled!");
    res.status(200).json({ message: "2FA successfully enabled!" });
  } catch (error) {
    console.log("❌ Failed to enable 2FA: ", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/2fa/verify-login", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { passcode } = req.body;

    if (!passcode || passcode.length !== 6) {
      return res
        .status(400)
        .json({ error: "Please enter a valid 6-digit passcode" });
    }

    const user = await User.findById(userId).select("-password");

    if (!user || !user.sharedSecret) {
      return res.status(400).json({ error: "2FA generation required first" });
    }
    // Decrypt the secret from the database
    const decryptedSecret = decryptSecret(user.sharedSecret);

    // Validate the 6-digit code against the decrypted secret
    const result = await verify({ secret: decryptedSecret, token: passcode });

    if (!result.valid) {
      return res.status(400).json({ error: "Invalid 2FA code" });
    }
    
    const token = user.generateToken();

    console.log("✅ 2FA verified successfully");
    res.status(200).json({ token });
  } catch (error) {
    console.log("❌ 2FA verification failed: ", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/2fa/verify-disable", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { passcode } = req.body;

    if (!passcode || passcode.length !== 6) {
      return res
        .status(400)
        .json({ error: "Please enter a valid 6-digit passcode" });
    }
    const user = await User.findById(userId).select("-password");

    if (!user || !user.sharedSecret) {
      return res.status(400).json({ error: "2FA generation required first" });
    }

    if (!user.is2FAEnabled) {
      return res.status(400).json({ error: "2FA is already disabled." });
    }

    // Decrypt the secret from the database
    const decryptedSecret = decryptSecret(user.sharedSecret);

    // Validate the 6-digit code against the decrypted secret
    const result = await verify({ secret: decryptedSecret, token: passcode });

    if (!result.valid) {
      return res.status(400).json({ error: "Invalid 2FA code" });
    }

    user.is2FAEnabled = false;
    user.sharedSecret = null;
    await user.save();
    console.log("✅ 2FA successfully disabled!");
    res.status(200).json({ message: "2FA successfully disabled!" });
  } catch (error) {
    console.log("❌ Failed to disable 2FA: ", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
