const { archiveOldLogs } = require('../modules/audit-logs/audit-logs.service');

function msUntilTime(hour, minute) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

async function runArchival() {
  console.log('[Retention] Starting scheduled audit log archival...');
  try {
    const result = await archiveOldLogs();
    if (result.archived > 0) {
      console.log(`[Retention] Done. Archived ${result.archived} records → ${result.file}`);
    } else {
      console.log('[Retention] Done. No logs older than 30 days found.');
    }
  } catch (err) {
    console.error('[Retention] Archival failed:', err.message);
  }
  // Schedule next run exactly 24 hours later
  setTimeout(runArchival, 24 * 60 * 60 * 1000);
}

function startRetentionJob() {
  // Run daily at 00:05, starting from the next occurrence
  const delay = msUntilTime(0, 5);
  setTimeout(runArchival, delay);
  const minutesUntil = Math.round(delay / 60000);
  console.log(`[Retention] Audit log retention job scheduled (first run in ${minutesUntil} min, then every 24h)`);
}

module.exports = { startRetentionJob };
