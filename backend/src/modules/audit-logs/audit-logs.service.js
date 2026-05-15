const fs = require('fs');
const path = require('path');
const prisma = require('../../config/db');

const ARCHIVE_DIR = path.join(__dirname, '../../../logs/archives');
const RETENTION_DAYS = 30;

function ensureArchiveDir() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}

function formatLogLine(log) {
  const ts = new Date(log.created_at).toISOString();
  const user = log.user ? `${log.user.full_name} <${log.user.email}>` : 'System';
  return `[${ts}] [${log.module_name}] [${log.activity}] user="${user}" ip="${log.ip_address || '-'}" desc="${log.description || ''}"`;
}

async function archiveOldLogs() {
  ensureArchiveDir();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const oldLogs = await prisma.auditLog.findMany({
    where: { created_at: { lt: cutoff } },
    include: { user: { select: { full_name: true, email: true } } },
    orderBy: { created_at: 'asc' },
  });

  if (oldLogs.length === 0) {
    return { archived: 0, file: null };
  }

  const dateLabel = new Date().toISOString().slice(0, 10);
  const archiveFile = path.join(ARCHIVE_DIR, `audit_${dateLabel}.log`);

  // Append to file if it exists (multiple runs on same day)
  const lines = oldLogs.map(formatLogLine).join('\n') + '\n';
  fs.appendFileSync(archiveFile, lines, 'utf8');

  // Delete archived records from DB
  const ids = oldLogs.map(l => l.id);
  await prisma.auditLog.deleteMany({ where: { id: { in: ids } } });

  console.log(`[Retention] Archived ${oldLogs.length} audit logs → ${archiveFile}`);
  return { archived: oldLogs.length, file: archiveFile };
}

function listArchives() {
  ensureArchiveDir();
  const files = fs.readdirSync(ARCHIVE_DIR)
    .filter(f => f.startsWith('audit_') && f.endsWith('.log'))
    .sort()
    .reverse()
    .map(f => {
      const filePath = path.join(ARCHIVE_DIR, f);
      const stat = fs.statSync(filePath);
      return {
        filename: f,
        size_bytes: stat.size,
        created_at: stat.birthtime,
        modified_at: stat.mtime,
      };
    });
  return files;
}

module.exports = { archiveOldLogs, listArchives, RETENTION_DAYS };
