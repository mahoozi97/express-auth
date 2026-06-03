const router = require("express").Router();
const googleRoutes = require("./google.route");
const localRoutes = require("./local.route");
const verificationRoutes = require("./verify.route");
const twoFactorRoutes = require("./twoFactor.route");
const authLimiter = require("../../middleware/limiter");

router.use("/", authLimiter, localRoutes);
router.use("/", googleRoutes);
router.use("/", verificationRoutes);
router.use("/", authLimiter, twoFactorRoutes);

module.exports = router;
