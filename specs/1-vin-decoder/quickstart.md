# Quickstart: VIN Decoder MVP

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (Neon)
- Existing AI Car Finder backend running

## Installation

```bash
# Перейти в backend
cd backend

# Установить зависимости (если новые)
npm install

# Применить миграцию
psql $DATABASE_URL -f ../database/migrations/002_add_vin_tables.sql
```

## Configuration

Добавить в `.env`:

```bash
# VIN Decoder
VIN_CACHE_TTL=86400  # 24 hours in seconds

# ГИБДД (опционально, требует captcha solver)
GIBDD_ENABLED=false
RUCAPTCHA_API_KEY=your-key

# ФНП (работает без настройки)
FNP_ENABLED=true

# ФССП (требует регистрацию)
FSSP_ENABLED=false
FSSP_API_TOKEN=your-token
```

## Usage

### API Endpoints

**Расшифровать VIN:**
```bash
curl -X POST http://localhost:3000/api/v1/vin/decode \
  -H "Content-Type: application/json" \
  -d '{"vin": "WBAPH5C55BA123456"}'
```

**Полная проверка:**
```bash
curl -X POST http://localhost:3000/api/v1/vin/check \
  -H "Content-Type: application/json" \
  -d '{"vin": "WBAPH5C55BA123456"}'
```

**Получить из кэша:**
```bash
curl http://localhost:3000/api/v1/vin/check/WBAPH5C55BA123456
```

### MCP Server

**Запуск:**
```bash
cd backend/mcp-server
node index.js
```

**Claude Desktop config:**
```json
{
  "mcpServers": {
    "vin-decoder": {
      "command": "node",
      "args": ["/path/to/backend/mcp-server/index.js"]
    }
  }
}
```

**Использование в Claude:**
```
Проверь VIN WBAPH5C55BA123456
```

## Testing

```bash
# Smoke tests
curl http://localhost:3000/api/v1/vin/decode -X POST \
  -H "Content-Type: application/json" \
  -d '{"vin": "WBAPH5C55BA123456"}'

# Должен вернуть:
# {
#   "success": true,
#   "decode": {
#     "brand": "BMW",
#     "manufacturer": "BMW AG",
#     "country": "Germany",
#     "year": 2011
#   }
# }
```

## Troubleshooting

### "Invalid VIN"
- Проверить длину (17 символов)
- VIN не должен содержать I, O, Q
- Заменить кириллицу на латиницу

### "GIBDD unavailable"
- ГИБДД требует captcha
- Включить `GIBDD_ENABLED=true` и настроить `RUCAPTCHA_API_KEY`

### "FNP timeout"
- Сервис ФНП иногда медленный
- Увеличить timeout в конфиге
