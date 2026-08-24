import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    // The account this ledger entry belongs to (whose balance it affected).
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },

    reference: { type: String, required: true, unique: true },

    // CREDIT/DEBIT describe the effect on `account`'s balance.
    // `type` additionally distinguishes an admin credit or a peer transfer.
    direction: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    type: { type: String, enum: ['CREDIT', 'DEBIT', 'TRANSFER'], required: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD' },

    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
      default: 'PENDING',
    },

    description: { type: String, trim: true, maxlength: 200 },

    // For TRANSFER entries: the other party's readable info, denormalized
    // so transaction history doesn't require a join to display.
    counterpartyAccountNumber: { type: String, default: null },
    counterpartyName: { type: String, default: null },

    // Links the sender's DEBIT entry to the recipient's CREDIT entry for the
    // same transfer, so the pair can be reconciled or reversed together.
    transferGroupId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },

    // Set when an admin performed the action (credits), for audit purposes.
    performedByAdmin: { type: String, default: null },
  },
  { timestamps: true }
);

transactionSchema.index({ account: 1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
