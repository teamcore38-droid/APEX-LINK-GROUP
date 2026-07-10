import AuditLog from '../models/auditLogModel.js';

const recordAuditLog = async (req, action, resourceType = '', resourceId = '', metadata = {}) => {
  try {
    await AuditLog.create({
      actor: req.user?._id || null,
      actorName: req.user?.name || '',
      actorEmail: req.user?.email || '',
      action,
      resourceType,
      resourceId: String(resourceId || ''),
      requestMethod: req.method || '',
      requestPath: req.originalUrl || req.path || '',
      ipAddress: req.ip || req.headers?.['x-forwarded-for'] || '',
      userAgent: req.headers?.['user-agent'] || '',
      metadata,
    });
  } catch (error) {
    console.error('[auditService:recordAuditLog]', error);
  }
};

export { recordAuditLog };
