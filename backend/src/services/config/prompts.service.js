const promptsRepo = require('../../repositories/prompts.repository');
const { DEFAULT_PROMPT_CONFIG } = require('../../constants/defaultPrompt');

let promptConfig = { ...DEFAULT_PROMPT_CONFIG };

async function loadPromptConfig() {
  try {
    const row = await promptsRepo.getActivePromptConfig();
    if (row) {
      promptConfig = {
        ...promptConfig,
        version: row.version,
        system_prompt: row.system_prompt,
        temperature: row.temperature,
        max_tokens: row.max_tokens,
        updated_at: row.created_at
      };
      console.log(`Loaded prompt config v${promptConfig.version} from DB`);
    }
  } catch (err) {
    console.error('Failed to load prompt config:', err.message);
  }
}

function getPromptConfig() {
  return promptConfig;
}

async function updatePromptConfig(systemPrompt, temperature, maxTokens, userId) {
  // Read current version from DB to avoid race conditions
  const currentDbConfig = await promptsRepo.getActivePromptConfig();
  const previousVersion = currentDbConfig ? currentDbConfig.version : 0;
  const newVersion = previousVersion + 1;

  // Use DB values as fallback, then memory config, then defaults
  const finalSystemPrompt = systemPrompt ||
    (currentDbConfig?.system_prompt) ||
    promptConfig.system_prompt;
  const finalTemperature = temperature !== undefined ? temperature :
    (currentDbConfig?.temperature ?? promptConfig.temperature);
  const finalMaxTokens = maxTokens !== undefined ? maxTokens :
    (currentDbConfig?.max_tokens ?? promptConfig.max_tokens);

  await promptsRepo.insertPromptVersion(
    newVersion,
    finalSystemPrompt,
    finalTemperature,
    finalMaxTokens,
    userId
  );

  if (previousVersion > 0) {
    await promptsRepo.archivePromptVersion(previousVersion);
  }

  await loadPromptConfig();

  return { previousVersion, newVersion };
}

module.exports = {
  loadPromptConfig,
  getPromptConfig,
  updatePromptConfig,
};
