const router = require("express").Router();
const User = require("../../models/User");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// - - - - - - - - - - - - - Google OAuth - - - - - - - - - - - - - -

router.post("/google/callback", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken)
      return res.status(400).json({ error: "ID Token is required" });

    const client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      "postmessage",
    );

    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log(payload);

    let user = await User.findOne({ email: payload.email }).select(
      "-password -sharedKey",
    );
    if (user && user.authProvider !== "google") {
      return res.status(400).json({
        error:
          "This email is already registered. Please log in with your email and password.",
      });
    }
    if (!user) {
      user = await User.create({
        email: payload.email,
        username: payload.name,
        profilePicture: payload.picture,
        isVerified: true,
        authProvider: "google",
      });
    }

    const token = user.generateToken();
    console.log("✅ Signed in with google successfully");
    res.status(200).json({ token });
  } catch (error) {
    console.log("❌ Sign in with google failed: ", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
