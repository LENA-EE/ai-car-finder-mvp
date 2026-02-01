const { uploadCatalog, clearCatalog } = require('../services/catalog/upload.service');
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

module.exports = { upload, clear };
