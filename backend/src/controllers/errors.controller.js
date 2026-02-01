const errorsRepo = require('../repositories/errors.repository');
const { logAdminAction } = require('../repositories/audit.repository');

async function getErrors(req, res) {
  try {
    const showResolved = req.query.resolved === 'true';
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const [errorsResult, statsResult] = await Promise.all([
      errorsRepo.getErrors(showResolved, limit),
      errorsRepo.getErrorStats()
    ]);

    res.json({
      errors: errorsResult.rows,
      stats: {
        unresolved: parseInt(statsResult.rows[0].unresolved_count) || 0,
        resolved: parseInt(statsResult.rows[0].resolved_count) || 0,
        total_occurrences: parseInt(statsResult.rows[0].total_occurrences) || 0,
        error_types: parseInt(statsResult.rows[0].error_types) || 0
      }
    });
  } catch (err) {
    console.error('Error graveyard fetch error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

async function resolveError(req, res) {
  const id = parseInt(req.params.id);
  const { resolution_note } = req.body;

  try {
    const result = await errorsRepo.resolveError(id, resolution_note);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', details: 'Error not found' });
    }

    await logAdminAction(req.user.id, req.user.email, 'resolve_error', {
      error_id: id,
      query_pattern: result.rows[0].query_pattern,
      resolution_note
    }, req);

    res.json({ success: true, error: result.rows[0] });
  } catch (err) {
    console.error('Error resolve error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

async function deleteError(req, res) {
  const id = parseInt(req.params.id);

  try {
    const result = await errorsRepo.deleteError(id);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', details: 'Error not found' });
    }

    await logAdminAction(req.user.id, req.user.email, 'delete_error', {
      error_id: id,
      query_pattern: result.rows[0].query_pattern
    }, req);

    res.json({ success: true, deleted_id: id });
  } catch (err) {
    console.error('Error delete error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

module.exports = { getErrors, resolveError, deleteError };
