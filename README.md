# express-auth

OAuth 2.0 (Google) + traditional sign up / sign in built with Node.js and Express.

## Features
- Google OAuth 2.0
- Traditional sign up / sign in
- JWT authentication

## Environment Variables
```env
PORT=
MONGODB_URI=
JWT_SECRET_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

## Routes
| Method | Route | Description |
|---|---|---|
| POST | /auth/signup | Traditional sign up |
| POST | /auth/signin | Traditional sign in |
| GET | /auth/google | Google OAuth |
| GET | /auth/google/callback | Google OAuth callback |

## Project Setup

### 1. Initialize npm

```bash
npm init -y
```

### 2. Install dependencies

```bash
npm install express mongoose dotenv morgan cors jsonwebtoken bcrypt helmet axios validator
```

### 3. Install development dependencies

```bash
npm install nodemon --save-dev
```
