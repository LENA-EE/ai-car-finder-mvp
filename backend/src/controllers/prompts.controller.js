const { getPromptConfig, updatePromptConfig } = require('../services/config/prompts.service');
const { getSynonyms, addSynonym, loadSynonyms } = require('../services/config/synonyms.service');
const { loadPromptConfig } = require('../services/config/prompts.service');
const { logAdminAction } = require('../repositories/audit.repository');
const config = require('../config');

function getPrompts(req, res) {
  const promptConfig = getPromptConfig();
  res.json({
    ...promptConfig,
    synonyms: getSynonyms(),
    llm_enabled: config.llmEnabled
  });
}

async function updatePrompts(req, res) {
  const { system_prompt, temperature, max_tokens, synonyms } = req.body;

  try {
    const promptConfig = getPromptConfig();
    const previousVersion = promptConfig.version;

    const { newVersion } = await updatePromptConfig(
      system_prompt,
      temperature,
      max_tokens,
      req.user.id
    );

    if (synonyms) {
      for (const [slang, normalized] of Object.entries(synonyms)) {
        await addSynonym(slang, normalized);
      }
      await loadSynonyms();
    }

    await logAdminAction(req.user.id, req.user.email, 'edit_prompt', {
      previous_version: previousVersion,
      new_version: newVersion,
      changes: { system_prompt: !!system_prompt, temperature, max_tokens, synonyms_count: synonyms ? Object.keys(synonyms).length : 0 }
    }, req);

    const updatedConfig = getPromptConfig();

    res.json({
      status: 'reloaded',
      previous_version: previousVersion,
      current_version: updatedConfig.version,
      updated_at: updatedConfig.updated_at
    });
  } catch (err) {
    console.error('Update prompts error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

module.exports = { getPrompts, updatePrompts };
