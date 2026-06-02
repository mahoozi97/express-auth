// https://www.w3schools.com/nodejs/nodejs_email.asp

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

const sendEmailVerification = (to, token) => {
  const verificationUrl = `http://localhost:3000/auth/verify/${token}`;
  const mailOptions = {
    from: process.env.EMAIL,
    to: to,
    subject: "Email Verification",
    html: `<h2>Welcome to the app!</h2>
  <p>Please click the link below to verify your email address:</p>
  <a href="${verificationUrl}">Click here to verify your email</a>`,
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
