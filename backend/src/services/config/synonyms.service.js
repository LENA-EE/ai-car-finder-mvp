const synonymsRepo = require('../../repositories/synonyms.repository');

let SYNONYMS = {};

async function loadSynonyms() {
  try {
    const rows = await synonymsRepo.getAllBrandSynonyms();
    SYNONYMS = {};
    for (const row of rows) {
      SYNONYMS[row.slang.toLowerCase()] = row.normalized;
    }
    console.log(`Loaded ${rows.length} synonyms from DB`);
  } catch (err) {
    console.error('Failed to load synonyms:', err.message);
  }
}

function getSynonyms() {
  return SYNONYMS;
}

async function addSynonym(slang, normalized) {
  await synonymsRepo.upsertSynonym(slang, normalized);
}

module.exports = {
  loadSynonyms,
  getSynonyms,
  addSynonym,
};
