// ============================================================
// Generic CRUD Factory untuk semua modul
// ============================================================

const { PrismaClient } = require('@prisma/client');
const express = require('express');
const prisma = new PrismaClient();

function createCrudRoutes(modelName, options = {}) {
  const router = express.Router();
  const { authenticate } = require('../middlewares/auth.middleware');
  const { authorize } = require('../middlewares/role.middleware');
  const mod = options.permissionModule;
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
      await prisma[modelName].delete({ where: { id: req.params.id } });
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

// Export routes untuk masing-masing modul
module.exports = createCrudRoutes;
