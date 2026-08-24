import dotenv from 'dotenv';

dotenv.config();

const required = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ADMIN_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD_HASH',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
  // Fail fast and loudly rather than booting with undefined secrets.
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in real values before starting the server.');
  process.exit(1);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mongoUri: process.env.MONGO_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    adminSecret: process.env.JWT_ADMIN_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
    adminExpires: process.env.JWT_ADMIN_EXPIRES || '4h',
  },

  otp: {
    expiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES, 10) || 10,
  },
  passwordReset: {
    expiresMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES, 10) || 30,
  },

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,

  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || 'Spring Financial Bank <onboarding@resend.dev>',
  },

  admin: {
    email: (process.env.ADMIN_EMAIL || '').toLowerCase(),
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
  },
};

export default env;
