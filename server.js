const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");

require("dotenv").config();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

// import routes
const authRoutes = require("./controllers/auth.route");

const app = express();
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);
// app.use(cors({ origin: "http://localhost:5173" }));

// Routes
app.use("/auth", authRoutes);

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
