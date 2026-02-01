const xml2js = require('xml2js');

async function parseAutoRuXml(content) {
  const parser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: true,
    trim: true
  });

  const result = await parser.parseStringPromise(content);
  const records = [];

  const getText = (obj) => {
    if (!obj) return null;
    if (typeof obj === 'string') return obj.trim();
    if (obj._) return obj._.trim();
    if (obj.$) return null;
    return String(obj).trim();
  };

  const getAttr = (obj, attr) => {
    if (!obj) return null;
    if (obj.$ && obj.$[attr]) return obj.$[attr];
    if (obj[attr]) return obj[attr];
    return null;
  };

  const parseModificationId = (modId) => {
    if (!modId) return {};
    const result = {};

    const volumeMatch = modId.match(/^(\d+\.?\d*)(d|hyb)?/i);
    if (volumeMatch) {
      result.engine_volume = parseFloat(volumeMatch[1]);
      if (volumeMatch[2]) {
        result.engine_type = volumeMatch[2].toLowerCase() === 'd' ? 'diesel' : 'hybrid';
      } else {
        result.engine_type = 'petrol';
      }
    }

    if (modId.toLowerCase().includes('electro') || modId.includes('кВт')) {
      result.engine_type = 'electric';
    }

    const transMatch = modId.match(/\b(MT|AT|AMT|CVT)\b/i);
    if (transMatch) {
      result.transmission = transMatch[1].toUpperCase();
    }

    const hpMatch = modId.match(/\((\d+)\s*(л\.с\.|кВт)\)/);
    if (hpMatch) {
      let hp = parseInt(hpMatch[1]);
      if (hpMatch[2] === 'кВт') {
        hp = Math.round(hp * 1.36);
      }
      result.hp = hp;
    }

    if (modId.includes('4WD') || modId.includes('AWD') || modId.includes('4x4')) {
      result.drive_type = '4WD';
    }

    return result;
  };

  const parseYears = (yearsStr) => {
    if (!yearsStr) return {};
    const result = {};

    const match = yearsStr.match(/(\d{4})\s*[-–]\s*(\d{4}|по н\.в\.)/);
    if (match) {
      result.year_from = parseInt(match[1]);
      if (match[2] !== 'по н.в.') {
        result.year_to = parseInt(match[2]);
      } else {
        result.year_to = new Date().getFullYear();
      }
    }

    return result;
  };

  const processNestedStructure = (data) => {
    const catalog = data.catalog || data.cars || data.data || data;

    let marks = catalog.mark || catalog.marks || catalog.brand || catalog.brands || [];
    if (!Array.isArray(marks)) marks = [marks];

    for (const mark of marks) {
      const markName = getAttr(mark, 'name') || getText(mark.name) || getText(mark.mark_name);
      const markCode = getAttr(mark, 'code') || getText(mark.code) || getText(mark.mark_code);

      if (!markName) continue;

      let folders = mark.folder || mark.folders || mark.model || mark.models || [];
      if (!Array.isArray(folders)) folders = [folders];

      for (const folder of folders) {
        const folderName = getAttr(folder, 'name') || getText(folder.name) || getText(folder.folder_name);
        const folderId = getAttr(folder, 'id') || getText(folder.id) || getText(folder.folder_id);
        const modelName = getText(folder.model) || getText(folder.model_name);

        let modifications = folder.modification || folder.modifications || folder.variant || folder.variants || [];
        if (!Array.isArray(modifications)) modifications = [modifications];

        if (modifications.length === 0) {
          records.push({
            mark_name: markName,
            mark_code: markCode,
            folder_name: folderName,
            folder_id: folderId,
            model_name: modelName,
            body_type: getText(folder.body_type),
            engine_volume: parseFloat(getText(folder.engine_volume)) || null,
            hp: parseInt(getText(folder.hp) || getText(folder.power)) || null,
            transmission: getText(folder.transmission),
            drive_type: getText(folder.drive_type) || getText(folder.drive),
            engine_type: getText(folder.engine_type) || getText(folder.fuel),
            year: parseInt(getText(folder.year)) || null,
            year_from: parseInt(getText(folder.year_from)) || null,
            year_to: parseInt(getText(folder.year_to)) || null,
            price: parseInt(getText(folder.price)) || null
          });
        } else {
          for (const mod of modifications) {
            const modificationName = getAttr(mod, 'name') || getText(mod.name) || getText(mod.modification_name);
            const yearsStr = getText(mod.years);

            const parsedMod = parseModificationId(modificationName);
            const parsedYears = parseYears(yearsStr);

            records.push({
              mark_name: markName,
              mark_code: markCode,
              folder_name: folderName,
              folder_id: folderId,
              model_name: getText(mod.model_name) || getText(mod.model) || modelName,
              modification_name: modificationName,
              modification_id: getAttr(mod, 'id') || getText(mod.id) || getText(mod.modification_id),
              tech_param_id: getAttr(mod, 'tech_param_id') || getText(mod.tech_param_id),
              configuration_id: getText(mod.configuration_id),
              body_type: getText(mod.body_type),
              engine_volume: parseFloat(getText(mod.engine_volume) || getText(mod.volume)) || parsedMod.engine_volume || null,
              hp: parseInt(getText(mod.hp) || getText(mod.power) || getText(mod.horsepower)) || parsedMod.hp || null,
              transmission: getText(mod.transmission) || parsedMod.transmission || null,
              drive_type: getText(mod.drive_type) || getText(mod.drive) || parsedMod.drive_type || null,
              engine_type: getText(mod.engine_type) || getText(mod.fuel) || parsedMod.engine_type || null,
              year: parseInt(getText(mod.year)) || parsedYears.year_from || null,
              year_from: parseInt(getText(mod.year_from)) || parsedYears.year_from || null,
              year_to: parseInt(getText(mod.year_to)) || parsedYears.year_to || null,
              price: parseInt(getText(mod.price)) || null
            });
          }
        }
      }
    }
    return records;
  };

  const processFlatStructure = (data) => {
    const root = data.cars || data.catalog || data.data || data;
    let cars = root.car || root.cars || root.item || root.items || root.vehicle || root.vehicles || [];
    if (!Array.isArray(cars)) cars = [cars];

    for (const car of cars) {
      if (!car) continue;
      const markName = getText(car.mark_name) || getText(car.mark) || getText(car.brand);
      if (!markName) continue;

      records.push({
        mark_name: markName,
        mark_code: getText(car.mark_code),
        folder_name: getText(car.folder_name) || getText(car.model),
        folder_id: getText(car.folder_id),
        model_name: getText(car.model_name),
        modification_name: getText(car.modification_name) || getText(car.modification),
        modification_id: getText(car.modification_id),
        tech_param_id: getText(car.tech_param_id),
        configuration_id: getText(car.configuration_id),
        body_type: getText(car.body_type),
        engine_volume: parseFloat(getText(car.engine_volume) || getText(car.volume)) || null,
        hp: parseInt(getText(car.hp) || getText(car.power) || getText(car.horsepower)) || null,
        transmission: getText(car.transmission),
        drive_type: getText(car.drive_type) || getText(car.drive),
        engine_type: getText(car.engine_type) || getText(car.fuel),
        year: parseInt(getText(car.year)) || null,
        year_from: parseInt(getText(car.year_from)) || null,
        year_to: parseInt(getText(car.year_to)) || null,
        price: parseInt(getText(car.price)) || null
      });
    }
    return records;
  };

  const nestedRecords = processNestedStructure(result);
  if (nestedRecords.length > 0) {
    return nestedRecords;
  }

  return processFlatStructure(result);
}

module.exports = { parseAutoRuXml };
