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

const send2FaEnabledEmail = (to, role) => {
  const path = role === "user" ? "profile" : "admin-profile";
  const mailOptions = {
    from: process.env.EMAIL,
    to: to,
    subject: "Security Update: Two-Factor Authentication Enabled",
    html: `
      <h2>2FA Setup Complete!</h2>
      <p>Great job! Your account is now protected with Two-Factor Authentication.</p>
      <p><a href="${process.env.CLIENT_URL}/${path}">Go to your Profile</a></p>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Failed to send 2FA enable email:", error);
    } else {
      console.log("✅ 2FA enable email sent:", info.response);
    }
  });
};

const send2FaDisabledEmail = (to) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: to,
    subject: "Security Alert: Two-Factor Authentication Disabled",
    html: `
      <h2>2FA Has Been Disabled</h2>
      <p>We are writing to let you know that Two-Factor Authentication (2FA) has been disabled for your account.</p>
      <p>Your account is now less secure. We highly recommend re-enabling 2FA as soon as possible.</p>
      <p><strong>Didn't do this?</strong> If you did not disable 2FA, please secure your account and contact support immediately.</p>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Failed to send 2FA disable email:", error);
    } else {
      console.log("✅ 2FA disable email sent:", info.response);
    }
  });
};

const send2FaResetEmail = (to, token) => {
  const reset2FaUrl = `${process.env.CLIENT_URL}/2fa-reset/${token}`;

  const mailOptions = {
    from: process.env.EMAIL,
    to: to,
    subject: "Action Required: 2FA Reset Request",
    html: `
      <h2>Reset Your Two-Factor Authentication (2FA)</h2>
      <p>We received a request to reset the 2FA settings for your account.</p>
      <p>If you initiated this request, please click the button below to verify and proceed with resetting your 2FA:</p>
      
      <p> <a href="${reset2FaUrl}">Reset 2FA</a> </p>
      
      <p><small>If you did not request this, please ignore this email. Your account remains secure.</small></p>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Failed to send 2FA reset email:", error);
    } else {
      console.log("✅ 2FA reset email sent:", info.response);
    }
  });
};

module.exports = {
  sendEmailVerification,
  send2FaEnabledEmail,
  send2FaDisabledEmail,
  send2FaResetEmail,
};
