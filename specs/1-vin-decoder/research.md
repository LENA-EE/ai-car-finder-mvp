# Research: VIN Decoder MVP

**Date**: 2026-02-21
**Branch**: `1-vin-decoder`

## 1. VIN Structure (ISO 3779)

### Decision
Использовать стандарт ISO 3779 для валидации и расшифровки VIN.

### Findings

VIN состоит из 17 символов:
```
WMI (1-3) | VDS (4-9) | VIS (10-17)
   ↓           ↓           ↓
Производитель  Модель     Серийный номер
```

**WMI (World Manufacturer Identifier)**:
- Символ 1: Регион (W=Европа, J=Япония, 1-5=Северная Америка)
- Символы 2-3: Производитель (BA=BMW, VF=Renault, JT=Toyota)

**VDS (Vehicle Descriptor Section)**:
- Символы 4-8: Модель, кузов, двигатель (зависит от производителя)
- Символ 9: Контрольная цифра (алгоритм MOD 11)

**VIS (Vehicle Identifier Section)**:
- Символ 10: Год выпуска (A=1980...Y=2000, 1=2001...9=2009, A=2010...)
- Символ 11: Завод
- Символы 12-17: Серийный номер

### Alternatives Considered
- NHTSA API (только США) — не подходит для РФ
- Платные сервисы (VINDecoder.eu) — избыточно для MVP

---

## 2. API ГИБДД

### Decision
Использовать публичный API гибдд.рф/check/auto

### Findings

**Endpoint**: `https://гибдд.рф/check/auto`

**Доступные проверки**:
| Проверка | URL | Данные |
|----------|-----|--------|
| История регистрации | /history | Периоды владения, регионы |
| ДТП | /dtp | Даты, типы повреждений |
| Розыск | /wanted | В розыске да/нет |
| Ограничения | /restrict | Запреты на рег. действия |

**Формат запроса**:
```
POST /check/auto/{type}
Content-Type: application/x-www-form-urlencoded
vin={VIN}&captchaWord={captcha}
```

**Проблема**: Требуется captcha!

**Решение для MVP**:
1. Использовать headless browser (Puppeteer) для обхода captcha
2. Или интегрировать сервис распознавания captcha (rucaptcha.com ~2₽/шт)
3. Или использовать агрегатор (avtocod.ru API)

### Alternatives Considered
- Прямой запрос без captcha — не работает
- Парсинг HTML — хрупкое решение

---

## 3. Реестр залогов ФНП

### Decision
Использовать API reestr-zalogov.ru

### Findings

**Endpoint**: `https://www.reestr-zalogov.ru/api/search`

**Формат**:
```json
POST /api/search
{
  "filter": {
    "vin": "WBAPH5C55BA123456"
  }
}
```

**Ответ** (если залог есть):
```json
{
  "total": 1,
  "results": [{
    "pledgor": "ООО Банк",
    "date": "2023-01-15",
    "number": "2023-001-123456"
  }]
}
```

**Лимиты**: Бесплатно, без регистрации, без captcha.

---

## 4. API ФССП

### Decision
Использовать публичный API fssp.gov.ru

### Findings

**Endpoint**: `https://api-ip.fssp.gov.ru/api/v1.0/search`

**Требования**:
- Нужен API токен (бесплатная регистрация)
- Поиск по ФИО владельца (не по VIN напрямую)

**Проблема**: ФССП не ищет по VIN, только по ФИО.

**Решение для MVP**:
- Получить ФИО владельца из ГИБДД
- Затем проверить по ФССП
- Или пропустить ФССП в MVP (Phase 2)

---

## 5. MCP Protocol

### Decision
Использовать официальный MCP SDK от Anthropic.

### Findings

**MCP Server Structure**:
```javascript
import { Server } from "@modelcontextprotocol/sdk/server";

const server = new Server({
  name: "vin-decoder",
  version: "1.0.0"
});

server.tool("decode_vin", { vin: "string" }, async (args) => {
  return decodeVin(args.vin);
});
```

**Интеграция с Claude Desktop**:
```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "vin-decoder": {
      "command": "node",
      "args": ["path/to/mcp-server/index.js"]
    }
  }
}
```

---

## 6. Caching Strategy

### Decision
PostgreSQL с TTL 24 часа.

### Findings

**Таблица**:
```sql
CREATE TABLE vin_checks (
  id SERIAL PRIMARY KEY,
  vin VARCHAR(17) NOT NULL,
  check_type VARCHAR(20) NOT NULL,  -- decode, gibdd, fnp, fssp
  result JSONB NOT NULL,
  checked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_vin_checks_vin ON vin_checks(vin);
CREATE INDEX idx_vin_checks_expires ON vin_checks(expires_at);
```

**Логика**:
1. Проверить кэш по VIN + check_type
2. Если есть и не expired → вернуть из кэша
3. Иначе → запросить API → сохранить в кэш

---

## Summary

| Компонент | Решение | Сложность |
|-----------|---------|-----------|
| VIN Decoder | Собственный парсер ISO 3779 | Низкая |
| ГИБДД | Puppeteer + captcha solver | Высокая |
| ФНП | Прямой API | Низкая |
| ФССП | Через ФИО из ГИБДД | Средняя |
| MCP | Официальный SDK | Низкая |
| Кэш | PostgreSQL + TTL | Низкая |

**MVP Scope**:
- Phase 1: VIN Decoder + ФНП (без captcha)
- Phase 2: ГИБДД (с captcha solver)
- Phase 3: MCP Server
