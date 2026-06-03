const router = require("express").Router();
const googleRoutes = require("./google.route");
const localRoutes = require("./local.route");
const verificationRoutes = require("./verify.route");
const twoFactorRoutes = require("./twoFactor.route");

router.use("/", localRoutes);
router.use("/", googleRoutes);
router.use("/", verificationRoutes);
router.use("/", twoFactorRoutes);

module.exports = router;
