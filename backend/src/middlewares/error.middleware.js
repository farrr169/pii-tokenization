function errorMiddleware(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Data duplikat' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Data tidak ditemukan' });
    }
  }

  const status = err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan pada server';

  return res.status(status).json({ status: 'error', message });
}

module.exports = { errorMiddleware };
