// role.middleware.js
function authorize(action, module) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Tidak terautentikasi' });
    }

    // Admin punya akses penuh
    if (req.user.role === 'Admin') {
      return next();
    }

    const hasPermission = req.user.permissions.some(
      p => p.action === action && p.module === module
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'error',
        message: `Tidak ada akses untuk ${action} pada modul ${module}`
      });
    }

    next();
  };
}

module.exports = { authorize };
