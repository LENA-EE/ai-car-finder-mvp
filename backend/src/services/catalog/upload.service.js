const { parse: csvParse } = require('csv-parse/sync');
const { parseAutoRuXml } = require('./xmlParser.service');
const carsRepo = require('../../repositories/cars.repository');
const { generateEmbeddingsBatch, isAvailable: isEmbeddingsAvailable, estimateCost } = require('../embeddings/embeddings.service');
const { buildCarTexts } = require('../embeddings/carTextBuilder');

async function uploadCatalog(file) {
  const filename = file.originalname.toLowerCase();
  const isXml = filename.endsWith('.xml');
  const isCsv = filename.endsWith('.csv');

  if (!isXml && !isCsv) {
    throw { code: 'INVALID_FORMAT', message: 'Only CSV and XML files are supported' };
  }

  const content = file.buffer.toString('utf-8');
  let records = [];

  if (isCsv) {
    try {
      records = csvParse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
      });
    } catch (parseErr) {
      throw { code: 'PARSE_ERROR', message: `CSV parse error: ${parseErr.message}` };
    }
  } else if (isXml) {
    try {
      records = await parseAutoRuXml(content);
    } catch (parseErr) {
      throw { code: 'PARSE_ERROR', message: `XML parse error: ${parseErr.message}` };
    }
  }

  if (records.length === 0) {
    throw { code: 'EMPTY_FILE', message: 'File contains no valid records' };
  }

  const errors = [];
  const warnings = [];
  let recordsAdded = 0;
  let duplicates = 0;
  const marks = new Set();
  const models = new Set();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 1;

    if (!row.mark_name || (typeof row.mark_name === 'string' && row.mark_name.trim() === '')) {
      errors.push({ row: rowNum, error: 'Missing required field: mark_name' });
      continue;
    }

    const car = {
      mark_name: typeof row.mark_name === 'string' ? row.mark_name.trim() : row.mark_name,
      mark_code: row.mark_code || null,
      folder_name: row.folder_name || null,
      folder_id: row.folder_id || null,
      model_name: row.model_name || null,
      modification_name: row.modification_name || null,
      modification_id: row.modification_id || null,
      tech_param_id: row.tech_param_id || null,
      configuration_id: row.configuration_id || null,
      body_type: row.body_type || null,
      engine_volume: typeof row.engine_volume === 'number' ? row.engine_volume : (parseFloat(row.engine_volume) || null),
      hp: typeof row.hp === 'number' ? row.hp : (parseInt(row.hp) || null),
      transmission: row.transmission || null,
      drive_type: row.drive_type || null,
      engine_type: row.engine_type || null,
      year: typeof row.year === 'number' ? row.year : (parseInt(row.year) || null),
      year_from: typeof row.year_from === 'number' ? row.year_from : (parseInt(row.year_from) || null),
      year_to: typeof row.year_to === 'number' ? row.year_to : (parseInt(row.year_to) || null),
      price: typeof row.price === 'number' ? row.price : (parseInt(row.price) || null)
    };

    try {
      await carsRepo.insertCar(car);
      recordsAdded++;
      marks.add(car.mark_name);
      if (car.folder_name) models.add(car.folder_name);
    } catch (dbErr) {
      if (dbErr.code === '23505') {
        duplicates++;
      } else {
        errors.push({ row: rowNum, error: `DB error: ${dbErr.message}` });
      }
    }
  }

  if (duplicates > 0) {
    warnings.push({ type: 'duplicates', count: duplicates });
  }

  return {
    recordsAdded,
    marksCount: marks.size,
    modelsCount: models.size,
    errors: errors.slice(0, 50),
    warnings
  };
}

async function clearCatalog() {
  return carsRepo.clearCatalog();
}

/**
 * Generate embeddings for cars that don't have them
 * @param {number} batchSize - Number of cars to process per batch
 * @returns {Promise<{processed: number, totalTokens: number, costUsd: number}>}
 */
async function generateEmbeddingsForNewCars(batchSize = 100) {
  if (!isEmbeddingsAvailable()) {
    throw { code: 'EMBEDDINGS_UNAVAILABLE', message: 'OPENAI_API_KEY is not set' };
  }

  let totalProcessed = 0;
  let totalTokens = 0;

  while (true) {
    // Get batch of cars without embeddings
    const cars = await carsRepo.getCarsWithoutEmbeddings(batchSize);

    if (cars.length === 0) {
      break;
    }

    console.log(`[Embeddings] Processing batch of ${cars.length} cars...`);

    // Build text descriptions
    const carTexts = buildCarTexts(cars);

    // Generate embeddings
    const { embeddings, tokens } = await generateEmbeddingsBatch(carTexts.map(ct => ct.text));

    // Update cars with embeddings
    const updates = carTexts.map((ct, i) => ({
      id: ct.id,
      embedding: embeddings[i],
    }));

    await carsRepo.batchUpdateEmbeddings(updates);

    totalProcessed += cars.length;
    totalTokens += tokens;

    console.log(`[Embeddings] Processed ${totalProcessed} cars (${tokens} tokens this batch)`);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    processed: totalProcessed,
    totalTokens,
    costUsd: estimateCost(totalTokens),
  };
}

/**
 * Get embedding statistics
 */
async function getEmbeddingStats() {
  return carsRepo.getEmbeddingStats();
}

module.exports = {
  uploadCatalog,
  clearCatalog,
  generateEmbeddingsForNewCars,
  getEmbeddingStats,
};
