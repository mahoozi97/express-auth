const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      trim: true,
      required: [true, "Please provide a username"],
      minlength: 3,
      maxlength: 56,
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Please provide an email"],
    },
    password: {
      type: String,
      minlength: 6,
      required: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    is2FAEnabled: {
      type: Boolean,
      default: false,
    },
    sharedSecret: {
      type: String,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();
  if (update.password) {
    update.password = await bcrypt.hash(update.password, 10);
  }
});

userSchema.methods.generateToken = function (lifeTime, purpose = "access") {
  // All tokens need the User ID and token type
  const payload = {
    _id: this._id,
    purpose,
  };

  // Sign-in tokens also need basic profile data for the frontend
  if (purpose === "access") {
    payload.role = this.role;
    payload.username = this.username;
    payload.email = this.email;
    payload.isVerified = this.isVerified;
  }

  const token = jwt.sign({ ...payload }, process.env.JWT_SECRET_KEY, {
    expiresIn: lifeTime || process.env.JWT_LIFETIME,
  });
  return token;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
