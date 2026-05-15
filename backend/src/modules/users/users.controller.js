const prisma = require('../../config/db');
const bcrypt = require('bcryptjs');
const { auditFromReq } = require('../../utils/auditLog');

async function getRoleId(roleName) {
  const role = await prisma.role.findFirst({ where: { role_name: roleName } });
  return role?.id || null;
}

function sanitize(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

async function listUsers(req, res) {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = search ? {
      OR: [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    } : {};

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true },
        orderBy: { created_at: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      status: 'success',
      data: data.map(sanitize),
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

async function createUser(req, res) {
  try {
    const { full_name, email, password, role } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'full_name, email, dan password wajib diisi' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'Email sudah terdaftar' });
    }

    const role_id = role ? await getRoleId(role) : null;
    const password_hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { full_name, email, password_hash, role_id, status: 'active' },
      include: { role: true },
    });

    await auditFromReq(req, 'users', 'create', `User "${full_name}" ditambahkan sebagai ${role || 'Data Consumer'}`);
    return res.status(201).json({ status: 'success', data: sanitize(user) });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { full_name, email, password, role, status } = req.body;

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (email    !== undefined) updateData.email = email;
    if (status   !== undefined) updateData.status = status;
    if (role     !== undefined) updateData.role_id = await getRoleId(role);
    if (password) updateData.password_hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    await auditFromReq(req, 'users', 'update', `User "${user.full_name}" diperbarui`);
    return res.json({ status: 'success', data: sanitize(user) });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      return res.status(400).json({ status: 'error', message: 'Tidak dapat menghapus akun sendiri' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });

    await prisma.user.delete({ where: { id } });
    await auditFromReq(req, 'users', 'delete', `User "${existing.full_name}" (${existing.email}) dihapus`);
    return res.json({ status: 'success', message: 'User berhasil dihapus' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
}

async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      return res.status(400).json({ status: 'error', message: 'Tidak dapat menonaktifkan akun sendiri' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    const user = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      include: { role: true },
    });

    const activity = newStatus === 'inactive' ? 'deactivate' : 'activate';
    await auditFromReq(req, 'users', activity,
      `User "${user.full_name}" ${newStatus === 'inactive' ? 'dinonaktifkan' : 'diaktifkan'}`);
    return res.json({ status: 'success', data: sanitize(user) });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser, toggleStatus };
