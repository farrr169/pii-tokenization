const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          include: {
            role_permissions: { include: { permission: true } }
          }
        }
      }
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ status: 'error', message: 'User tidak valid atau tidak aktif' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role?.role_name,
      permissions: user.role?.role_permissions.map(rp => ({
        module: rp.permission.module_name,
        action: rp.permission.permission_name
      })) || []
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Token tidak valid atau kedaluwarsa' });
    }
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}

module.exports = { authenticate };
