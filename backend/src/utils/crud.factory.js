const prisma = require('../config/db');
const express = require('express');
const { auditFromReq } = require('./auditLog');

// Human-readable labels per model for audit descriptions
const MODEL_LABELS = {
  user: 'User',
  role: 'Role',
  permission: 'Permission',
  piiType: 'PII Type',
  tokenizationMethod: 'Metode Tokenisasi',
  tokenizationRule: 'Rule Tokenisasi',
  tweak: 'Tweak',
  tokenizationJob: 'Job Tokenisasi',
  systemSetting: 'Pengaturan',
};

function nameOf(record) {
  return record?.full_name || record?.rule_name || record?.method_name || record?.role_name
    || record?.permission_name || record?.name || record?.job_name || record?.key || record?.id || '';
}

function createCrudRoutes(modelName, options = {}) {
  const router = express.Router();
  const { authenticate } = require('../middlewares/auth.middleware');
  const { authorize } = require('../middlewares/role.middleware');
  const mod = options.permissionModule;
  const label = MODEL_LABELS[modelName] || modelName;
  const passThrough = (req, res, next) => next();

  router.use(authenticate);

  // GET all
  router.get('/', mod ? authorize('read', mod) : passThrough, async (req, res) => {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = search && options.searchFields ? {
        OR: options.searchFields.map(field => ({
          [field]: { contains: search, mode: 'insensitive' }
        }))
      } : {};

      const [data, total] = await Promise.all([
        prisma[modelName].findMany({
          where,
          include: options.include || {},
          orderBy: options.orderBy || { created_at: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma[modelName].count({ where })
      ]);

      return res.json({
        status: 'success',
        data,
        pagination: { total, page: parseInt(page), limit: parseInt(limit) }
      });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // GET by ID
  router.get('/:id', mod ? authorize('read', mod) : passThrough, async (req, res) => {
    try {
      const record = await prisma[modelName].findUnique({
        where: { id: req.params.id },
        include: options.include || {}
      });

      if (!record) {
        return res.status(404).json({ status: 'error', message: 'Data tidak ditemukan' });
      }
      return res.json({ status: 'success', data: record });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // POST create
  router.post('/', mod ? authorize('create', mod) : passThrough, async (req, res) => {
    try {
      const record = await prisma[modelName].create({ data: req.body });
      if (mod) {
        await auditFromReq(req, mod, 'create', `${label} "${nameOf(record)}" ditambahkan`);
      }
      return res.status(201).json({ status: 'success', data: record });
    } catch (error) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
  });

  // PUT update
  router.put('/:id', mod ? authorize('update', mod) : passThrough, async (req, res) => {
    try {
      const record = await prisma[modelName].update({
        where: { id: req.params.id },
        data: req.body
      });
      if (mod) {
        await auditFromReq(req, mod, 'update', `${label} "${nameOf(record)}" diperbarui`);
      }
      return res.json({ status: 'success', data: record });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ status: 'error', message: 'Data tidak ditemukan' });
      }
      return res.status(400).json({ status: 'error', message: error.message });
    }
  });

  // DELETE
  router.delete('/:id', mod ? authorize('delete', mod) : passThrough, async (req, res) => {
    try {
      // Fetch name before deletion for the log description
      let recordName = req.params.id;
      try {
        const existing = await prisma[modelName].findUnique({ where: { id: req.params.id } });
        if (existing) recordName = nameOf(existing);
      } catch (_) {}

      await prisma[modelName].delete({ where: { id: req.params.id } });

      if (mod) {
        await auditFromReq(req, mod, 'delete', `${label} "${recordName}" dihapus`);
      }
      return res.json({ status: 'success', message: 'Data berhasil dihapus' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ status: 'error', message: 'Data tidak ditemukan' });
      }
      return res.status(400).json({ status: 'error', message: error.message });
    }
  });

  return router;
}

module.exports = createCrudRoutes;
