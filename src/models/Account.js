import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    accountNumber: { type: String, required: true, unique: true },

    // The stored balance is always in baseCurrency. Any other currency shown
    // to the user is a display-only conversion computed at request time —
    // never stored, never authoritative. See project spec, "Balances and currencies".
    baseCurrency: { type: String, default: 'USD' },
    balance: { type: Number, required: true, default: 0, min: 0 },

    status: { type: String, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export default mongoose.model('Account', accountSchema);
