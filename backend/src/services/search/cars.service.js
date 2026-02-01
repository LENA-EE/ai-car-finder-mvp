const carsRepo = require('../../repositories/cars.repository');

async function searchCars(filters, limit = 10, offset = 0) {
  return carsRepo.searchCars(filters, limit, offset);
}

async function getCarById(id) {
  return carsRepo.getCarById(id);
}

async function getCatalogCount() {
  return carsRepo.getCatalogCount();
}

module.exports = {
  searchCars,
  getCarById,
  getCatalogCount,
};
