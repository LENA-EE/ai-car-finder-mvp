const { getCarById } = require('../services/search/cars.service');

async function getCar(req, res) {
  const id = parseInt(req.params.id);

  try {
    const car = await getCarById(id);

    if (!car) {
      return res.status(404).json({ error: 'NOT_FOUND', details: `Car ${id} not found` });
    }

    res.json(car);
  } catch (err) {
    console.error('Get car error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

module.exports = { getCar };
