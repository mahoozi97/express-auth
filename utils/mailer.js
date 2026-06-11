// https://www.w3schools.com/nodejs/nodejs_email.asp

const nodemailer = require("nodemailer");

const CLIENT_URL = process.env.CLIENT_URL;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

const sendEmailVerification = (to, token, isVerified = false) => {
  const verificationUrl = `${CLIENT_URL}/verify/${token}`;
  let subject, htmlContent;

  if (isVerified) {
    subject = "Email Verified Successfully!";
    htmlContent = `
      <h2>Verification Complete!</h2>
      <p>Your email address has been successfully verified.</p>
      <p>You can now fully access all features of the app.</p>
      <a href="${CLIENT_URL}/profile">Go to your Profile</a>
    `;
  } else {
    subject = "Email Verification";
    htmlContent = `<h2>Welcome to the app!</h2>
  <p>Please click the link below to verify your email address:</p>
  <a href="${verificationUrl}">Click here to verify your email</a>`;
  }

  const mailOptions = {
    from: process.env.EMAIL,
    to: to,
    subject: subject,
    html: htmlContent,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Failed to send email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
};

module.exports = sendEmailVerification;
