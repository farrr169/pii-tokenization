const { PrismaClient } = require('@prisma/client');
const { tokenize } = require('./fpe.service');
const { z } = require('zod');

const prisma = new PrismaClient();

// Validation schema
const tokenizeSchema = z.object({
  pii_type_id: z.string().uuid(),
  method_id: z.string().uuid(),
  rule_id: z.string().uuid().optional(),
  value: z.string().min(1),
  save_result: z.boolean().optional().default(false)
});

const batchSchema = z.object({
  job_name: z.string().min(1),
  rule_id: z.string().uuid(),
  data: z.array(z.object({
    pii_type_id: z.string().uuid(),
    value: z.string().min(1)
  })).min(1).max(1000)
});

/**
 * POST /api/tokenization/tokenize
 * Single tokenisasi
 */
async function tokenizeSingle(req, res) {
  try {
    const body = tokenizeSchema.parse(req.body);

    // Get rule & method config
    let rule = null;
    let method = null;
    let tweak = null;

    if (body.rule_id) {
      rule = await prisma.tokenizationRule.findUnique({
        where: { id: body.rule_id },
        include: { method: true, tweak: true }
      });
    }

    if (!rule) {
      method = await prisma.tokenizationMethod.findUnique({
        where: { id: body.method_id }
      });
    }

    const methodConfig = rule?.method || method;
    const tweakConfig = rule?.tweak || null;

    if (!methodConfig) {
      return res.status(404).json({ status: 'error', message: 'Method tidak ditemukan' });
    }

    // Perform tokenization
    const result = tokenize({
      value: body.value,
      method: methodConfig.method_name,
      tweakConfig: tweakConfig ? {
        tweak_type: tweakConfig.tweak_type,
        tweak_value: tweakConfig.tweak_value,
        user_id: req.user?.id
      } : null,
      preservePrefix: rule?.preserve_prefix || 0,
      preserveSuffix: rule?.preserve_suffix || 0,
      maintainLength: rule?.maintain_length ?? true,
      maintainCharset: rule?.maintain_charset ?? true
    });

    if (!result.success) {
      return res.status(400).json({ status: 'error', message: result.error });
    }

    // Optionally save to DB
    if (body.save_result) {
      const crypto = require('crypto');
      const piiRecord = await prisma.piiData.create({
        data: {
          pii_type_id: body.pii_type_id,
          original_value: body.value,
          data_hash: crypto.createHash('sha256').update(body.value).digest('hex'),
          created_by: req.user?.id
        }
      });

      const job = await prisma.tokenizationJob.create({
        data: {
          job_name: `Single-${Date.now()}`,
          total_data: 1,
          success_count: 1,
          failed_count: 0,
          status: 'completed',
          created_by: req.user?.id,
          started_at: new Date(),
          completed_at: new Date()
        }
      });

      await prisma.tokenizationResult.create({
        data: {
          job_id: job.id,
          pii_data_id: piiRecord.id,
          rule_id: rule?.id,
          tokenized_value: result.tokenized_value,
          processing_time_ms: result.processing_time_ms,
          status: 'success'
        }
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        module_name: 'tokenization',
        activity: 'tokenize',
        description: `Tokenisasi ${methodConfig.method_name} berhasil`,
        ip_address: req.ip
      }
    });

    return res.json({
      status: 'success',
      data: {
        tokenized_value: result.tokenized_value,
        method_used: methodConfig.method_name,
        tweak_used: result.tweak_used,
        processing_time_ms: result.processing_time_ms,
        length_preserved: result.length_preserved
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

/**
 * POST /api/tokenization/batch
 * Batch tokenisasi
 */
async function tokenizeBatch(req, res) {
  try {
    const body = batchSchema.parse(req.body);

    const rule = await prisma.tokenizationRule.findUnique({
      where: { id: body.rule_id },
      include: { method: true, tweak: true }
    });

    if (!rule) {
      return res.status(404).json({ status: 'error', message: 'Rule tidak ditemukan' });
    }

    // Create job
    const job = await prisma.tokenizationJob.create({
      data: {
        job_name: body.job_name,
        total_data: body.data.length,
        status: 'running',
        created_by: req.user?.id,
        started_at: new Date()
      }
    });

    // Process each record
    const results = [];
    let success = 0;
    let failed = 0;

    for (const item of body.data) {
      const tokenResult = tokenize({
        value: item.value,
        method: rule.method?.method_name,
        tweakConfig: rule.tweak ? {
          tweak_type: rule.tweak.tweak_type,
          tweak_value: rule.tweak.tweak_value,
          user_id: req.user?.id
        } : null,
        preservePrefix: rule.preserve_prefix,
        preserveSuffix: rule.preserve_suffix,
        maintainLength: rule.maintain_length,
        maintainCharset: rule.maintain_charset
      });

      const crypto = require('crypto');
      const piiRecord = await prisma.piiData.create({
        data: {
          pii_type_id: item.pii_type_id,
          original_value: item.value,
          data_hash: crypto.createHash('sha256').update(item.value).digest('hex'),
          created_by: req.user?.id
        }
      });

      const resultRecord = await prisma.tokenizationResult.create({
        data: {
          job_id: job.id,
          pii_data_id: piiRecord.id,
          rule_id: rule.id,
          tokenized_value: tokenResult.success ? tokenResult.tokenized_value : null,
          processing_time_ms: tokenResult.processing_time_ms,
          status: tokenResult.success ? 'success' : 'failed',
          error_message: tokenResult.success ? null : tokenResult.error
        }
      });

      if (tokenResult.success) success++;
      else failed++;

      results.push({
        original: item.value,
        tokenized: tokenResult.tokenized_value,
        status: tokenResult.success ? 'success' : 'failed'
      });
    }

    // Update job status
    await prisma.tokenizationJob.update({
      where: { id: job.id },
      data: {
        success_count: success,
        failed_count: failed,
        status: failed === 0 ? 'completed' : 'completed',
        completed_at: new Date()
      }
    });

    return res.json({
      status: 'success',
      data: {
        job_id: job.id,
        total: body.data.length,
        success,
        failed,
        results
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

/**
 * GET /api/tokenization/results
 */
async function getResults(req, res) {
  try {
    const { page = 1, limit = 20, job_id } = req.query;
    const skip = (page - 1) * limit;

    const where = job_id ? { job_id } : {};

    const [results, total] = await Promise.all([
      prisma.tokenizationResult.findMany({
        where,
        include: {
          job: { select: { job_name: true } },
          rule: { select: { rule_name: true } }
        },
        orderBy: { created_at: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.tokenizationResult.count({ where })
    ]);

    return res.json({
      status: 'success',
      data: results,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * GET /api/tokenization/stats
 */
async function getStats(req, res) {
  try {
    const [totalResults, successResults, failedResults, totalJobs, recentActivity] = await Promise.all([
      prisma.tokenizationResult.count(),
      prisma.tokenizationResult.count({ where: { status: 'success' } }),
      prisma.tokenizationResult.count({ where: { status: 'failed' } }),
      prisma.tokenizationJob.count(),
      prisma.tokenizationResult.findMany({
        take: 7,
        orderBy: { created_at: 'desc' },
        select: { created_at: true, status: true }
      })
    ]);

    const avgProcessingTime = await prisma.tokenizationResult.aggregate({
      _avg: { processing_time_ms: true },
      where: { status: 'success' }
    });

    return res.json({
      status: 'success',
      data: {
        total_tokenizations: totalResults,
        success_count: successResults,
        failed_count: failedResults,
        success_rate: totalResults > 0 ? ((successResults / totalResults) * 100).toFixed(1) : 0,
        total_jobs: totalJobs,
        avg_processing_time_ms: Math.round(avgProcessingTime._avg.processing_time_ms || 0),
        recent_activity: recentActivity
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = { tokenizeSingle, tokenizeBatch, getResults, getStats };
