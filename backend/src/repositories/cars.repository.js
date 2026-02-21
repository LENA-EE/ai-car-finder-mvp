const { pool } = require('../config/database');

async function searchCars(filters, limit = 10, offset = 0) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.mark_name) {
    conditions.push(`LOWER(mark_name) = LOWER($${paramIndex})`);
    params.push(filters.mark_name);
    paramIndex++;
  }

  if (filters.folder_name) {
    conditions.push(`LOWER(folder_name) LIKE LOWER($${paramIndex})`);
    params.push(`%${filters.folder_name}%`);
    paramIndex++;
  }

  if (filters.engine_type) {
    conditions.push(`LOWER(engine_type) = LOWER($${paramIndex})`);
    params.push(filters.engine_type);
    paramIndex++;
  }

  if (filters.engine_volume_min) {
    conditions.push(`engine_volume >= $${paramIndex}`);
    params.push(filters.engine_volume_min);
    paramIndex++;
  }

  if (filters.engine_volume_max) {
    conditions.push(`engine_volume <= $${paramIndex}`);
    params.push(filters.engine_volume_max);
    paramIndex++;
  }

  if (filters.body_type) {
    conditions.push(`body_type ILIKE $${paramIndex}`);
    params.push(`%${filters.body_type}%`);
    paramIndex++;
  }

  if (filters.transmission) {
    conditions.push(`LOWER(transmission) = LOWER($${paramIndex})`);
    params.push(filters.transmission);
    paramIndex++;
  }

  if (filters.drive_type) {
    conditions.push(`LOWER(drive_type) = LOWER($${paramIndex})`);
    params.push(filters.drive_type);
    paramIndex++;
  }

  if (filters.year_from) {
    conditions.push(`year >= $${paramIndex}`);
    params.push(filters.year_from);
    paramIndex++;
  }

  if (filters.year_to) {
    conditions.push(`year <= $${paramIndex}`);
    params.push(filters.year_to);
    paramIndex++;
  }

  if (filters.price_min) {
    conditions.push(`(price IS NULL OR price >= $${paramIndex})`);
    params.push(filters.price_min);
    paramIndex++;
  }

  if (filters.price_max) {
    conditions.push(`(price IS NULL OR price <= $${paramIndex})`);
    params.push(filters.price_max);
    paramIndex++;
  }

  if (filters.min_hp) {
    conditions.push(`hp >= $${paramIndex}`);
    params.push(filters.min_hp);
    paramIndex++;
  }

  if (filters.max_hp) {
    conditions.push(`hp <= $${paramIndex}`);
    params.push(filters.max_hp);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM cars_catalog ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0]?.total) || 0;

  const query = `
    SELECT id, mark_name, folder_name, body_type, engine_volume, hp,
           transmission, drive_type, engine_type, year, price
    FROM cars_catalog
    ${whereClause}
    ORDER BY year DESC, price ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const result = await pool.query(query, params);

  return {
    total,
    items: result.rows.map(car => ({
      ...car,
      name: `${car.mark_name} ${car.folder_name}`,
      engine: `${car.engine_volume} ${car.engine_type === 'diesel' ? 'Diesel' : 'Petrol'}, ${car.hp} hp`
    }))
  };
}

async function getCarById(id) {
  const result = await pool.query(
    `SELECT id, mark_name, folder_name, body_type, engine_volume, hp,
            transmission, drive_type, engine_type, year, price
     FROM cars_catalog WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getCatalogCount() {
  const result = await pool.query('SELECT COUNT(*) as total FROM cars_catalog');
  return parseInt(result.rows[0].total);
}

async function insertCar(car) {
  await pool.query(
    `INSERT INTO cars_catalog (mark_name, mark_code, folder_name, folder_id, model_name,
      modification_name, modification_id, tech_param_id, configuration_id, body_type,
      engine_volume, hp, transmission, drive_type, engine_type, year, year_from, year_to, price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
    [car.mark_name, car.mark_code, car.folder_name, car.folder_id, car.model_name,
     car.modification_name, car.modification_id, car.tech_param_id, car.configuration_id, car.body_type,
     car.engine_volume, car.hp, car.transmission, car.drive_type, car.engine_type,
     car.year, car.year_from, car.year_to, car.price]
  );
}

async function clearCatalog() {
  const result = await pool.query('DELETE FROM cars_catalog');
  return result.rowCount;
}

// ============================================
// VECTOR SEARCH FUNCTIONS (pgvector)
// ============================================

/**
 * Update embedding for a single car
 * @param {number} carId - Car ID
 * @param {number[]} embedding - 1536-dimensional vector
 */
async function updateCarEmbedding(carId, embedding) {
  const vectorStr = `[${embedding.join(',')}]`;
  await pool.query(
    'UPDATE cars_catalog SET embedding = $1::vector WHERE id = $2',
    [vectorStr, carId]
  );
}

/**
 * Batch update embeddings for multiple cars
 * @param {Array<{id: number, embedding: number[]}>} updates
 */
async function batchUpdateEmbeddings(updates) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { id, embedding } of updates) {
      const vectorStr = `[${embedding.join(',')}]`;
      await client.query(
        'UPDATE cars_catalog SET embedding = $1::vector WHERE id = $2',
        [vectorStr, id]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Search cars by vector similarity (cosine distance)
 * @param {number[]} queryEmbedding - Query vector
 * @param {number} limit - Max results
 * @param {number} threshold - Similarity threshold (0-1, higher = more similar)
 * @returns {Promise<Array>}
 */
async function searchCarsBySimilarity(queryEmbedding, limit = 10, threshold = 0.3) {
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // Using cosine distance: 1 - cosine_similarity
  // Lower distance = more similar
  // threshold of 0.3 means similarity > 0.7
  const result = await pool.query(`
    SELECT
      id, mark_name, folder_name, body_type, engine_volume, hp,
      transmission, drive_type, engine_type, year, price,
      1 - (embedding <=> $1::vector) as similarity
    FROM cars_catalog
    WHERE embedding IS NOT NULL
      AND (embedding <=> $1::vector) < $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `, [vectorStr, 1 - threshold, limit]);

  return result.rows.map(car => ({
    ...car,
    name: `${car.mark_name} ${car.folder_name}`,
    engine: `${car.engine_volume} ${car.engine_type === 'diesel' ? 'Diesel' : 'Petrol'}, ${car.hp} hp`,
    similarity: parseFloat(car.similarity).toFixed(3),
  }));
}

/**
 * Hybrid search: combine vector similarity with SQL filters
 */
async function searchCarsHybrid(queryEmbedding, filters, limit = 10, threshold = 0.3) {
  const conditions = ['embedding IS NOT NULL'];
  const params = [];
  let paramIndex = 1;

  // Add embedding parameter
  const vectorStr = `[${queryEmbedding.join(',')}]`;
  conditions.push(`(embedding <=> $${paramIndex}::vector) < $${paramIndex + 1}`);
  params.push(vectorStr, 1 - threshold);
  paramIndex += 2;

  // Add filters
  if (filters.mark_name) {
    conditions.push(`LOWER(mark_name) = LOWER($${paramIndex})`);
    params.push(filters.mark_name);
    paramIndex++;
  }

  if (filters.price_max) {
    conditions.push(`(price IS NULL OR price <= $${paramIndex})`);
    params.push(filters.price_max);
    paramIndex++;
  }

  if (filters.price_min) {
    conditions.push(`(price IS NULL OR price >= $${paramIndex})`);
    params.push(filters.price_min);
    paramIndex++;
  }

  if (filters.year_from) {
    conditions.push(`year >= $${paramIndex}`);
    params.push(filters.year_from);
    paramIndex++;
  }

  if (filters.year_to) {
    conditions.push(`year <= $${paramIndex}`);
    params.push(filters.year_to);
    paramIndex++;
  }

  if (filters.engine_type) {
    conditions.push(`LOWER(engine_type) = LOWER($${paramIndex})`);
    params.push(filters.engine_type);
    paramIndex++;
  }

  if (filters.body_type) {
    conditions.push(`body_type ILIKE $${paramIndex}`);
    params.push(`%${filters.body_type}%`);
    paramIndex++;
  }

  if (filters.transmission) {
    conditions.push(`LOWER(transmission) = LOWER($${paramIndex})`);
    params.push(filters.transmission);
    paramIndex++;
  }

  if (filters.drive_type) {
    conditions.push(`LOWER(drive_type) = LOWER($${paramIndex})`);
    params.push(filters.drive_type);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const result = await pool.query(`
    SELECT
      id, mark_name, folder_name, body_type, engine_volume, hp,
      transmission, drive_type, engine_type, year, price,
      1 - (embedding <=> $1::vector) as similarity
    FROM cars_catalog
    WHERE ${whereClause}
    ORDER BY embedding <=> $1::vector
    LIMIT $${paramIndex}
  `, [...params, limit]);

  return result.rows.map(car => ({
    ...car,
    name: `${car.mark_name} ${car.folder_name}`,
    engine: `${car.engine_volume} ${car.engine_type === 'diesel' ? 'Diesel' : 'Petrol'}, ${car.hp} hp`,
    similarity: parseFloat(car.similarity).toFixed(3),
  }));
}

/**
 * Get cars without embeddings for batch processing
 * @param {number} limit - Batch size
 */
async function getCarsWithoutEmbeddings(limit = 100) {
  const result = await pool.query(`
    SELECT id, mark_name, folder_name, body_type, engine_volume, hp,
           transmission, drive_type, engine_type, year, price
    FROM cars_catalog
    WHERE embedding IS NULL
    ORDER BY id
    LIMIT $1
  `, [limit]);

  return result.rows;
}

/**
 * Get embedding statistics
 */
async function getEmbeddingStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_cars,
      COUNT(embedding) as cars_with_embeddings,
      COUNT(*) - COUNT(embedding) as cars_without_embeddings
    FROM cars_catalog
  `);

  return {
    totalCars: parseInt(result.rows[0].total_cars),
    withEmbeddings: parseInt(result.rows[0].cars_with_embeddings),
    withoutEmbeddings: parseInt(result.rows[0].cars_without_embeddings),
  };
}

module.exports = {
  searchCars,
  getCarById,
  getCatalogCount,
  insertCar,
  clearCatalog,
  // Vector functions
  updateCarEmbedding,
  batchUpdateEmbeddings,
  searchCarsBySimilarity,
  searchCarsHybrid,
  getCarsWithoutEmbeddings,
  getEmbeddingStats,
};
