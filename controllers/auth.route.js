const router = require("express").Router();
const User = require("../models/User");
const axios = require("axios");
const validator = require("validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const GOOGLE_OAUTH_URL = process.env.GOOGLE_OAUTH_URL;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const GOOGLE_ACCESS_TOKEN_URL = process.env.GOOGLE_ACCESS_TOKEN_URL;

const GOOGLE_TOKEN_INFO_URL = process.env.GOOGLE_TOKEN_INFO_URL;

const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// - - - - - - - - - - - - - GOOGLE OAuth - - - - - - - - - - - - - -

router.get("/google", async (req, res) => {
  const state = "some_state";

  // ✅ Let URLSearchParams handle all encoding automatically
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
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;

    // Exchange authorization code for access token & id_token
    const { data: access_token_data } = await axios.post(
      GOOGLE_ACCESS_TOKEN_URL,
      new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    const { id_token } = access_token_data;

    // Verify id_token and get user info
    const { data: token_info_data, status } = await axios.get(
      `${GOOGLE_TOKEN_INFO_URL}?id_token=${id_token}`,
    );

    const { email, name } = token_info_data;

    let user = await User.findOne({ email }).select("-password");
    if (!user) {
      user = await User.create({ email, username: name });
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

router.post("/sign-up", async (req, res) => {
  try {
    const { email, password } = req.body;

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

    const createdUser = await User.create({ ...req.body });

    // change to object and delete the password & cpr.
    const {
      password: _password,
      cpr: _cpr,
      ...userObject
    } = createdUser.toObject();

    console.log("✅ Signed up successfully", userObject);
    res.status(201).json(userObject);
  } catch (error) {
    console.log("❌ Sign up failed. Please try again: ", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/sign-in", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(409).json({ error: "Please enter a valid email" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const foundUser = await User.findOne({ email: email });

    if (!foundUser) {
      return res.status(401).json({ error: "email or password incorrect" });
    }

    const validPassword = await bcrypt.compare(password, foundUser.password);

    if (!validPassword) {
      return res.status(401).json({ error: "email or password incorrect" });
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
