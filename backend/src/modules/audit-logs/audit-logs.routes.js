const express = require('express');
const router = express.Router();
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { archiveOldLogs, listArchives, RETENTION_DAYS } = require('./audit-logs.service');
const { auditFromReq } = require('../../utils/auditLog');

router.use(authenticate);

// POST /api/audit-logs/write — frontend-side activities log (any authenticated user)
router.post('/write', async (req, res) => {
  try {
    const { module_name, activity, description } = req.body;
    if (!module_name || !activity) {
      return res.status(400).json({ status: 'error', message: 'module_name dan activity wajib diisi' });
    }
    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id || null,
        module_name,
        activity,
        description: description || null,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }
    });
    return res.status(201).json({ status: 'success' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/audit-logs — list with pagination + filters
router.get('/', authorize('read', 'audit_logs'), async (req, res) => {
  try {
    const { page = 1, limit = 50, module_name, activity, user_id, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (module_name) where.module_name = module_name;
    if (activity)    where.activity    = activity;
    if (user_id)     where.user_id     = user_id;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { activity:    { contains: search, mode: 'insensitive' } },
        { module_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { full_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: logs,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
      retention_days: RETENTION_DAYS,
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/audit-logs/modules — distinct module names for filter UI
router.get('/modules', authorize('read', 'audit_logs'), async (req, res) => {
  try {
    const rows = await prisma.auditLog.findMany({
      select: { module_name: true },
      distinct: ['module_name'],
      orderBy: { module_name: 'asc' },
    });
    res.json({ status: 'success', data: rows.map(r => r.module_name).filter(Boolean) });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/audit-logs/activities — distinct activity names for filter UI
router.get('/activities', authorize('read', 'audit_logs'), async (req, res) => {
  try {
    const rows = await prisma.auditLog.findMany({
      select: { activity: true },
      distinct: ['activity'],
      orderBy: { activity: 'asc' },
    });
    res.json({ status: 'success', data: rows.map(r => r.activity).filter(Boolean) });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/audit-logs/archive — manually trigger archival (Admin only)
router.post('/archive', authorize('delete', 'audit_logs'), async (req, res) => {
  try {
    const result = await archiveOldLogs();
    await auditFromReq(req, 'audit_logs', 'archive',
      result.archived > 0
        ? `Arsip manual: ${result.archived} log diarsipkan ke ${result.file}`
        : 'Arsip manual: tidak ada log yang perlu diarsipkan'
    );
    res.json({ status: 'success', data: result });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/audit-logs/archives — list archive files
router.get('/archives', authorize('read', 'audit_logs'), async (req, res) => {
  try {
    const files = listArchives();
    res.json({ status: 'success', data: files });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;
