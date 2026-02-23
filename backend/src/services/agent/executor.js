/**
 * Tool Executor
 *
 * Исполняет вызовы инструментов от AI агента.
 * Может использовать локальные сервисы или удалённый Car Tools API.
 */

const config = require('../../config');

// Local services (fallback)
const { searchCars } = require('../search/cars.service');
const { semanticSearch, isSemanticSearchAvailable } = require('../search/semantic.service');
const vinChecker = require('../vin/checker.service');
const vinDecoder = require('../vin/decoder.service');

/**
 * Выполнить вызов инструмента
 */
async function executeTool(name, args) {
  console.log(`[Agent] Executing tool: ${name}`, args);

  // Используем удалённый API если настроен
  if (config.toolsApi.enabled) {
    return await executeRemote(name, args);
  }

  // Локальное выполнение
  return await executeLocal(name, args);
}

/**
 * Удалённое выполнение через Car Tools API
 */
async function executeRemote(name, args) {
  const url = `${config.toolsApi.url}/tools/execute`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: name, args }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    console.log(`[Agent] Remote API result for ${name}:`, result.success);
    return result;
  } catch (err) {
    console.error(`[Agent] Remote API error:`, err.message);
    // Fallback to local execution
    console.log(`[Agent] Falling back to local execution`);
    return await executeLocal(name, args);
  }
}

/**
 * Локальное выполнение
 */
async function executeLocal(name, args) {
  switch (name) {
    case 'search_cars':
      return await executeSearchCars(args);

    case 'check_vin':
      return await executeCheckVin(args);

    case 'decode_vin':
      return await executeDecodeVin(args);

    case 'get_model_info':
      return await executeGetModelInfo(args);

    case 'compare_models':
      return await executeCompareModels(args);

    case 'semantic_search':
      return await executeSemanticSearch(args);

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Поиск машин по параметрам
 */
async function executeSearchCars(args) {
  const { limit = 5, ...filters } = args;

  // Убираем пустые значения
  const cleanFilters = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== '') {
      cleanFilters[key] = value;
    }
  }

  try {
    const result = await searchCars(cleanFilters, limit, 0);
    return {
      success: true,
      total: result.total,
      cars: result.items.map(car => ({
        id: car.id,
        name: `${car.mark_name} ${car.folder_name}`,
        year: car.year,
        price: car.price,
        engine: `${car.engine_volume}L ${car.engine_type}, ${car.hp} л.с.`,
        transmission: car.transmission,
        drive: car.drive_type,
        body: car.body_type,
      })),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Полная проверка VIN
 */
async function executeCheckVin(args) {
  const { vin } = args;

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'VIN должен содержать 17 символов' };
  }

  try {
    const result = await vinChecker.checkVin(vin.toUpperCase());

    if (!result.valid) {
      return { success: false, error: result.error || 'Неверный VIN' };
    }

    return {
      success: true,
      vin: vin.toUpperCase(),
      vehicle: {
        brand: result.decode?.brand,
        model: result.decode?.model,
        year: result.decode?.year,
        country: result.decode?.country,
      },
      checks: {
        pledges: result.fnp?.available
          ? { found: result.fnp.pledgesCount > 0, count: result.fnp.pledgesCount }
          : { available: false, message: result.fnp?.message },
        gibdd: result.gibdd?.available
          ? {
              wanted: result.gibdd.wanted,
              accidents: result.gibdd.accidentsCount,
              restrictions: result.gibdd.restrictionsCount,
            }
          : { available: false, message: result.gibdd?.message },
      },
      status: result.status, // ok, warning, danger
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Расшифровка VIN
 */
async function executeDecodeVin(args) {
  const { vin } = args;

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'VIN должен содержать 17 символов' };
  }

  try {
    const result = await vinDecoder.decodeFull(vin.toUpperCase());

    if (!result.valid) {
      return { success: false, error: result.error || 'Не удалось расшифровать VIN' };
    }

    return {
      success: true,
      vin: vin.toUpperCase(),
      decoded: {
        brand: result.decode.brand,
        model: result.decode.model,
        year: result.decode.year,
        country: result.decode.country,
        manufacturer: result.decode.manufacturer,
        engine: result.decode.engine,
        bodyClass: result.decode.bodyClass,
        driveType: result.decode.driveType,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Информация о модели (болячки, обслуживание)
 * Здесь используем знания LLM напрямую, т.к. нет своей базы
 */
async function executeGetModelInfo(args) {
  const { brand, model, year_from, year_to } = args;

  // Возвращаем структуру для AI — он сам наполнит из своих знаний
  return {
    success: true,
    request: {
      brand,
      model,
      years: year_from && year_to ? `${year_from}-${year_to}` : 'все годы',
    },
    note: 'Используй свои знания чтобы рассказать о типичных болячках, стоимости обслуживания и надёжности этой модели.',
  };
}

/**
 * Сравнение моделей
 */
async function executeCompareModels(args) {
  const { model1, model2 } = args;

  return {
    success: true,
    models: [
      { brand: model1.brand, model: model1.model },
      { brand: model2.brand, model: model2.model },
    ],
    note: 'Сравни эти модели по надёжности, стоимости владения, управляемости и другим параметрам.',
  };
}

/**
 * Семантический поиск
 */
async function executeSemanticSearch(args) {
  const { query, limit = 5 } = args;

  if (!isSemanticSearchAvailable()) {
    return {
      success: false,
      error: 'Семантический поиск недоступен (нет embeddings в базе)',
    };
  }

  try {
    const result = await semanticSearch(query, { limit });
    return {
      success: true,
      query,
      total: result.total,
      cars: result.items.map(car => ({
        id: car.id,
        name: `${car.mark_name} ${car.folder_name}`,
        year: car.year,
        price: car.price,
        engine: `${car.engine_volume}L ${car.engine_type}, ${car.hp} л.с.`,
        transmission: car.transmission,
        similarity: car.similarity,
      })),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { executeTool };
