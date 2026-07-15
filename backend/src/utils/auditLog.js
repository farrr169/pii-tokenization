const prisma = require('../config/db');

async function logActivity({ userId, moduleName, activity, description, ipAddress, userAgent } = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId || null,
        module_name: moduleName,
        activity,
        description,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      }
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err.message);
  }
}

function auditFromReq(req, moduleName, activity, description) {
  return logActivity({
    userId: req.user?.id || null,
    moduleName,
    activity,
    description,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

module.exports = { logActivity, auditFromReq };
