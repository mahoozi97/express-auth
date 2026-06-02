const crypto = require("crypto");

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "utf-8");
const ALGORITHM = "aes-256-cbc";

// Encrypt the 2FA secret before saving to DB
function encryptSecret(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`; // Save IV and encrypted text together
}

// Decrypt the 2FA secret when validating codes
function decryptSecret(encryptedData) {
  const [ivHex, encryptedText] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = {
  encryptSecret,
  decryptSecret,
};
