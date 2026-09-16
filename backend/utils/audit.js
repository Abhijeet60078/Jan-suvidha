import AuditLog from "../models/AuditLog.js";

export const recordAudit = (req, action, resource, resourceId, details = {}) => AuditLog.create({
  actor: req.user._id,
  action,
  resource,
  resourceId: resourceId?.toString(),
  details,
  ip: req.ip,
});
