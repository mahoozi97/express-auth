const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");

require("dotenv").config();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;
const verifyToken = require("./middleware/verifyToken");

// import routes
const authRoutes = require("./controllers/auth/auth");

const app = express();
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));
// app.use(cors({ origin: "http://localhost:5173" }));

// Routes
app.use("/auth", authRoutes);

// dummy protected route
app.get("/api/verify-auth", verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Template authentication is working!",
    user: req.user, // Echoing back the verified user data
  });
});

app.get("/", (req, res) => {
  res.send(`${mongoose.connection.name} server is running`);
});

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} 🔥`);
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}
startServer();
