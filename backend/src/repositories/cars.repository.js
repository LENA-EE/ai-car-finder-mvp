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

module.exports = {
  searchCars,
  getCarById,
  getCatalogCount,
  insertCar,
  clearCatalog,
};
