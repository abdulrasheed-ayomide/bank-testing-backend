import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['ADMIN_LOGIN', 'ACCOUNT_CREDITED', 'USER_DISABLED', 'USER_ENABLED'],
      required: true,
    },
    admin: { type: String, required: true }, // admin email
    target: { type: String, default: null }, // e.g. account number or user id
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
