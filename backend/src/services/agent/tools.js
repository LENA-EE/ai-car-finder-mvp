/**
 * AI Agent Tools Definition
 *
 * Описание инструментов, которые AI может вызывать самостоятельно.
 * Формат совместим с OpenAI/DeepSeek function calling.
 */

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_cars',
      description: 'Поиск автомобилей в каталоге по параметрам. Используй когда пользователь ищет машину по марке, модели, цене, типу кузова и т.д.',
      parameters: {
        type: 'object',
        properties: {
          mark_name: {
            type: 'string',
            description: 'Марка автомобиля (BMW, Toyota, Mercedes-Benz, Audi, и т.д.)',
          },
          folder_name: {
            type: 'string',
            description: 'Модель автомобиля (X5, RAV4, Camry, и т.д.)',
          },
          body_type: {
            type: 'string',
            description: 'Тип кузова: Внедорожник 5 дв., Седан, Хэтчбек 5 дв., Купе, Универсал, Кроссовер',
          },
          engine_type: {
            type: 'string',
            description: 'Тип двигателя: diesel, petrol, hybrid, electric',
          },
          transmission: {
            type: 'string',
            description: 'Тип КПП: AT (автомат), MT (механика), CVT (вариатор), AMT (робот)',
          },
          drive_type: {
            type: 'string',
            description: 'Тип привода: 4WD (полный), FWD (передний), RWD (задний)',
          },
          price_min: {
            type: 'number',
            description: 'Минимальная цена в рублях',
          },
          price_max: {
            type: 'number',
            description: 'Максимальная цена в рублях',
          },
          year_from: {
            type: 'number',
            description: 'Год выпуска от (например 2020)',
          },
          year_to: {
            type: 'number',
            description: 'Год выпуска до (например 2024)',
          },
          limit: {
            type: 'number',
            description: 'Количество результатов (по умолчанию 5)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_vin',
      description: 'Полная проверка автомобиля по VIN номеру: залоги (ФНП), ДТП (ГИБДД), ограничения. Используй когда пользователь хочет проверить историю машины.',
      parameters: {
        type: 'object',
        properties: {
          vin: {
            type: 'string',
            description: 'VIN номер автомобиля (17 символов)',
          },
        },
        required: ['vin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'decode_vin',
      description: 'Расшифровка VIN номера: марка, модель, год выпуска, страна производства, тип двигателя. Используй когда нужно узнать информацию о машине по VIN.',
      parameters: {
        type: 'object',
        properties: {
          vin: {
            type: 'string',
            description: 'VIN номер автомобиля (17 символов)',
          },
        },
        required: ['vin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_model_info',
      description: 'Информация о модели автомобиля: типичные болячки, стоимость обслуживания, надёжность, на что смотреть при покупке. Используй когда пользователь спрашивает про конкретную модель.',
      parameters: {
        type: 'object',
        properties: {
          brand: {
            type: 'string',
            description: 'Марка автомобиля',
          },
          model: {
            type: 'string',
            description: 'Модель автомобиля',
          },
          year_from: {
            type: 'number',
            description: 'Поколение: год начала выпуска',
          },
          year_to: {
            type: 'number',
            description: 'Поколение: год окончания выпуска',
          },
        },
        required: ['brand', 'model'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_models',
      description: 'Сравнение двух моделей автомобилей по характеристикам, надёжности, стоимости владения. Используй когда пользователь выбирает между вариантами.',
      parameters: {
        type: 'object',
        properties: {
          model1: {
            type: 'object',
            properties: {
              brand: { type: 'string' },
              model: { type: 'string' },
            },
            required: ['brand', 'model'],
          },
          model2: {
            type: 'object',
            properties: {
              brand: { type: 'string' },
              model: { type: 'string' },
            },
            required: ['brand', 'model'],
          },
        },
        required: ['model1', 'model2'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'semantic_search',
      description: 'Семантический поиск по каталогу машин И базе знаний одновременно. Используй для абстрактных запросов ("надёжная семейная машина", "странная тачка", "что-то связанное с лошадьми"), а также когда пользователь спрашивает факты или советы. Возвращает похожие машины + релевантные статьи из базы знаний.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Описание желаемого автомобиля',
          },
          limit: {
            type: 'number',
            description: 'Количество результатов (по умолчанию 5)',
          },
        },
        required: ['query'],
      },
    },
  },
];

module.exports = { TOOLS };
