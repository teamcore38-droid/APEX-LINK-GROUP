import mongoose from 'mongoose';

const auditLogSchema = mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '', trim: true },
    actorEmail: { type: String, default: '', trim: true, lowercase: true },
    action: { type: String, required: true, trim: true },
    resourceType: { type: String, default: '', trim: true },
    resourceId: { type: String, default: '', trim: true },
    requestMethod: { type: String, default: '', trim: true },
    requestPath: { type: String, default: '', trim: true },
    ipAddress: { type: String, default: '', trim: true },
    userAgent: { type: String, default: '', trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
