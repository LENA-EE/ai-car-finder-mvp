const { pool } = require('../config/database');

async function getAllBrandSynonyms() {
  const result = await pool.query(
    "SELECT slang, normalized FROM synonyms WHERE category = 'brands'"
  );
  return result.rows;
}

async function upsertSynonym(slang, normalized) {
  await pool.query(
    `INSERT INTO synonyms (category, slang, normalized)
     VALUES ('brands', $1, $2)
     ON CONFLICT (category, slang) DO UPDATE SET normalized = $2`,
    [slang.toLowerCase(), normalized]
  );
}

module.exports = {
  getAllBrandSynonyms,
  upsertSynonym,
};
