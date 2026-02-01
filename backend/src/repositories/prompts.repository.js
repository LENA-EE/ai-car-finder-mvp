const { pool } = require('../config/database');

async function getActivePromptConfig() {
  const result = await pool.query(
    "SELECT version, system_prompt, temperature, max_tokens, created_at FROM prompt_versions WHERE status = 'active' ORDER BY version DESC LIMIT 1"
  );
  return result.rows[0] || null;
}

async function insertPromptVersion(version, systemPrompt, temperature, maxTokens, createdBy) {
  await pool.query(
    `INSERT INTO prompt_versions (version, system_prompt, temperature, max_tokens, status, created_by)
     VALUES ($1, $2, $3, $4, 'active', $5)`,
    [version, systemPrompt, temperature, maxTokens, createdBy]
  );
}

async function archivePromptVersion(version) {
  await pool.query(
    `UPDATE prompt_versions SET status = 'archived' WHERE version = $1`,
    [version]
  );
}

module.exports = {
  getActivePromptConfig,
  insertPromptVersion,
  archivePromptVersion,
};
