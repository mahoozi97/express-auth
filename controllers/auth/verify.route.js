const router = require("express").Router();
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const verifyToken = require("../../middleware/verifyToken");
const authLimiter = require("../../middleware/limiter");
const { sendEmailVerification, transporter } = require("../../utils/mailer");

// Verify Email Address
router.post("/verify/:token", authLimiter(), async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded._id).select(
      "-password -sharedKey",
    );

    if (!user) {
      return res.status(404).json({ error: "User no longer exists." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Your user is already verified." });
    }

    user.isVerified = true;
    await user.save();
    const mailOption = sendEmailVerification(user.email, null, true, user.role);
    const info = await transporter.sendMail(mailOption);

    const newToken = user.generateToken();

    console.log("✅ Email verified successfully!: ", info.response);
    res.json({
      success: true,
      token: newToken,
      message: "Email verified successfully!",
    });
  } catch (error) {
    console.error("❌ Failed or jwt expired: ", error);
    if (error.message === "jwt expired") {
      res
        .status(400)
        .json({ success: false, error: "Link is invalid or has expired." });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Resend Verification Email
router.post(
  "/resend-verification",
  verifyToken,
  authLimiter(),
  async (req, res) => {
    try {
      const userId = req.user._id;

      const foundUser = await User.findById(userId).select(
        "-password -sharedKey",
      );

      if (!foundUser) {
        return res.status(404).json({ error: "User no longer exists." });
      }

      if (foundUser.isVerified) {
        return res
          .status(400)
          .json({ error: "Your user is already verified." });
      }

      const token = foundUser.generateToken("10m", "email-verification");
      const mailOption = sendEmailVerification(foundUser.email, token);
      const info = await transporter.sendMail(mailOption);

      console.log("✅ Email verification sent successfully: ", info.response);
      res.status(200).json({ message: "Email verification sent successfully" });
    } catch (error) {
      console.log("❌ Send email verification failed: ", error);
      res.status(500).json({ error: error.message });
    }
  },
);

module.exports = router;
