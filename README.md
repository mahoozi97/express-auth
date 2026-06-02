# express-auth

OAuth 2.0 (Google) + traditional sign up / sign in built with Node.js and Express.

## Features

* Google OAuth 2.0
* Traditional sign up / sign in (with email verification)
* Email notifications via Nodemailer
* JWT authentication
* Rate Limiting

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET_KEY` | JWT signing secret |
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

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/mahoozi97/express-auth
```

### 2. Install dependencies

```bash
npm i
```