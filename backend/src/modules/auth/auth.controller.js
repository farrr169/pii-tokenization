const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role_id: z.string().uuid().optional()
});

async function login(req, res) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            role_permissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Email atau password salah' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ status: 'error', message: 'Akun tidak aktif' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ status: 'error', message: 'Email atau password salah' });
    }

    // Build permissions
    const permissions = user.role?.role_permissions.map(rp => ({
      module: rp.permission.module_name,
      action: rp.permission.permission_name
    })) || [];

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role?.role_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        module_name: 'auth',
        activity: 'login',
        description: `User ${email} berhasil login`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }
    });

    return res.json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role?.role_name,
          permissions
        }
      }
    });

  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ status: 'error', errors: error.errors });
    }
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}

async function register(req, res) {
  try {
    const data = registerSchema.parse(req.body);

    // Check email exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'Email sudah terdaftar' });
    }

    // Get default role (Viewer) if not specified
    let roleId = data.role_id;
    if (!roleId) {
      const viewerRole = await prisma.role.findFirst({ where: { role_name: 'Viewer' } });
      roleId = viewerRole?.id;
    }

    const password_hash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        full_name: data.full_name,
        email: data.email,
        password_hash,
        role_id: roleId
      },
      include: { role: true }
    });

    return res.status(201).json({
      status: 'success',
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role?.role_name
      }
    });

  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ status: 'error', errors: error.errors });
    }
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: {
          include: {
            role_permissions: { include: { permission: true } }
          }
        }
      }
    });

    const permissions = user.role?.role_permissions.map(rp => ({
      module: rp.permission.module_name,
      action: rp.permission.permission_name
    })) || [];

    return res.json({
      status: 'success',
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role?.role_name,
        status: user.status,
        last_login: user.last_login,
        permissions
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = { login, register, getProfile };
