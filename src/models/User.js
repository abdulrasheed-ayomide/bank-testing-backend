import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },

    passwordHash: { type: String, required: true, select: false },
    transactionPinHash: { type: String, required: true, select: false },

    emailVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE' },

    // Refresh token rotation: we store a hash of the current valid refresh
    // token so /auth/logout and /auth/refresh can invalidate stolen tokens
    // instead of trusting any token that merely verifies against the secret.
    refreshTokenHash: { type: String, select: false, default: null },

    // Login brute-force protection.
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },

    // Transaction PIN brute-force protection (separate counter — a wrong
    // password and a wrong PIN are different attack surfaces).
    failedPinAttempts: { type: Number, default: 0, select: false },
    pinLockUntil: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.transactionPinHash;
    delete ret.refreshTokenHash;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret.failedPinAttempts;
    delete ret.pinLockUntil;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
