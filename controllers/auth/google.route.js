const router = require("express").Router();
const User = require("../../models/User");
const axios = require("axios");
const crypto = require("crypto");

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

    let user = await User.findOne({ email }).select("-password -sharedKey");
    if (user && user.authProvider !== "google") {
      return res
        .status(400)
        .json({
          error:
            "This email is already registered. Please log in with your email and password.",
        });
    }
    if (!user) {
      user = await User.create({
        email,
        username: name,
        isVerified: true,
        authProvider: "google",
      });
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

module.exports = router;
