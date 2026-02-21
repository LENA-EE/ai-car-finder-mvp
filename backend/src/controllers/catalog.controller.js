const { uploadCatalog, clearCatalog, generateEmbeddingsForNewCars, getEmbeddingStats } = require('../services/catalog/upload.service');
const { logAdminAction } = require('../repositories/audit.repository');

async function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'NO_FILE', details: 'CSV or XML file required' });
  }

  const startTime = Date.now();

  try {
    const result = await uploadCatalog(req.file);
    const duration = Date.now() - startTime;

    await logAdminAction(req.user.id, req.user.email, 'upload_catalog', {
      filename: req.file.originalname,
      file_size: req.file.size,
      records_added: result.recordsAdded,
      errors_count: result.errors.length,
      duration_ms: duration
    }, req);

    res.json({
      success: true,
      records_added: result.recordsAdded,
      marks_count: result.marksCount,
      models_count: result.modelsCount,
      errors: result.errors,
      warnings: result.warnings,
      duration_ms: duration
    });
  } catch (err) {
    if (err.code) {
      return res.status(400).json({ error: err.code, details: err.message });
    }
    console.error('Catalog upload error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', details: err.message });
  }
}

async function clear(req, res) {
  try {
    const deletedCount = await clearCatalog();

    await logAdminAction(req.user.id, req.user.email, 'clear_catalog', {
      deleted_count: deletedCount
    }, req);

    res.json({
      success: true,
      deleted_count: deletedCount
    });
  } catch (err) {
    console.error('Clear catalog error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

/**
 * Generate embeddings for cars without them
 * POST /api/v1/admin/catalog/embeddings
 */
async function generateEmbeddings(req, res) {
  const startTime = Date.now();
  const batchSize = parseInt(req.body.batchSize) || 100;

  try {
    const result = await generateEmbeddingsForNewCars(batchSize);
    const duration = Date.now() - startTime;

    await logAdminAction(req.user.id, req.user.email, 'generate_embeddings', {
      processed: result.processed,
      tokens: result.totalTokens,
      cost_usd: result.costUsd,
      duration_ms: duration
    }, req);

    res.json({
      success: true,
      processed: result.processed,
      totalTokens: result.totalTokens,
      costUsd: result.costUsd,
      duration_ms: duration
    });
  } catch (err) {
    if (err.code) {
      return res.status(400).json({ error: err.code, details: err.message });
    }
    console.error('Generate embeddings error:', err.message);
    res.status(500).json({ error: 'EMBEDDINGS_ERROR', details: err.message });
  }
}

/**
 * Get embedding statistics
 * GET /api/v1/admin/catalog/embeddings/stats
 */
async function embeddingStats(req, res) {
  try {
    const stats = await getEmbeddingStats();
    res.json({
      success: true,
      ...stats,
      coverage: stats.totalCars > 0
        ? ((stats.withEmbeddings / stats.totalCars) * 100).toFixed(1) + '%'
        : '0%'
    });
  } catch (err) {
    console.error('Embedding stats error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

module.exports = { upload, clear, generateEmbeddings, embeddingStats };
