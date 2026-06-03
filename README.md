# express-auth

OAuth 2.0 (Google) + traditional sign up / sign in built with Node.js and Express.

## Features

* Google OAuth 2.0
* Traditional sign up / sign in (with email verification)
* Two-Factor Authentication (2FA): Fully compatible with Google Authenticator.
* Email notifications via Nodemailer
* JWT authentication
* Rate Limiting

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET_KEY` | JWT signing secret |
| `ENCRYPTION_KEY` | Secret key used to encrypt and decrypt the 2FA shared secret in the database |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `EMAIL` | Nodemailer sender email |
| `PASS` | Nodemailer email password |

## Routes

| Method | Route | Description |
| --- | --- | --- |
| POST | `/auth/sign-up` | Traditional sign up |
| POST | `/auth/sign-in` | Traditional sign in |
| POST | `/auth/verify/:token` | Verify email address |
| POST | `/auth/resend-verification` | Resends verification email (Requires auth)
| GET | `/auth/google` | Google OAuth |
| GET | `/auth/google/callback` | Google OAuth callback |
| POST | `/auth/2fa/generate` | Generates 2FA secret and returns QR code string (Requires auth) |
| POST | `/auth/2fa/verify-setup` | Verifies and completes initial 2FA activation (Requires auth) |
| POST | `/auth/2fa/verify-login` | Completes login by validating 2FA passcode (Requires temp token) |
| POST | `/auth/2fa/verify-disable`| Validates passcode and removes 2FA from account (Requires auth) |

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/mahoozi97/express-auth
```

### 2. Install dependencies

```bash
npm i
```