const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const prisma = new PrismaClient();
router.use(authenticate);
router.get('/', authorize('read', 'audit_logs'), async (req, res) => {
  try {
    const { page = 1, limit = 50, module_name } = req.query;
    const skip = (page - 1) * limit;
    const where = module_name ? { module_name } : {};
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, include: { user: { select: { full_name: true, email: true } } }, orderBy: { created_at: 'desc' }, skip: parseInt(skip), take: parseInt(limit) }),
      prisma.auditLog.count({ where })
    ]);
    res.json({ status: 'success', data: logs, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch(e) { res.status(500).json({ status: 'error', message: e.message }); }
});
module.exports = router;
