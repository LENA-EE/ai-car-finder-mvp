# Data Model: VIN Decoder MVP

**Date**: 2026-02-21
**Branch**: `1-vin-decoder`

## Entities

### VinDecodeResult

Результат расшифровки VIN номера.

| Field | Type | Description |
|-------|------|-------------|
| vin | string(17) | VIN номер |
| valid | boolean | Прошёл валидацию |
| region | string | Регион производства (Europe, Japan, USA) |
| country | string | Страна (Germany, Japan, USA) |
| manufacturer | string | Производитель (BMW, Toyota) |
| brand | string | Марка |
| model | string | Модель (если известна) |
| year | number | Год выпуска |
| plant | string | Завод (если известен) |
| checkDigit | string | Контрольная цифра |
| serial | string | Серийный номер |

### VinCheck

Результат проверки VIN по внешним источникам.

| Field | Type | Description |
|-------|------|-------------|
| id | number | ID записи |
| vin | string(17) | VIN номер |
| checkedAt | datetime | Дата проверки |
| expiresAt | datetime | Срок действия кэша |
| decode | VinDecodeResult | Расшифровка |
| gibdd | GibddResult | null | Данные ГИБДД |
| fnp | FnpResult | null | Данные ФНП |
| fssp | FsspResult | null | Данные ФССП |
| status | string | ok, warning, danger |

### GibddResult

Данные из ГИБДД.

| Field | Type | Description |
|-------|------|-------------|
| available | boolean | Сервис доступен |
| owners | OwnerRecord[] | История владения |
| accidents | AccidentRecord[] | ДТП |
| wanted | boolean | В розыске |
| restrictions | RestrictionRecord[] | Ограничения |

### OwnerRecord

| Field | Type | Description |
|-------|------|-------------|
| from | date | Дата начала владения |
| to | date | null | Дата окончания |
| region | string | Регион регистрации |
| type | string | Физ. лицо / Юр. лицо |

### AccidentRecord

| Field | Type | Description |
|-------|------|-------------|
| date | date | Дата ДТП |
| region | string | Регион |
| damage | string[] | Типы повреждений |

### RestrictionRecord

| Field | Type | Description |
|-------|------|-------------|
| type | string | Тип ограничения |
| region | string | Регион |
| authority | string | Кем наложено |
| date | date | Дата |

### FnpResult

Данные из реестра залогов ФНП.

| Field | Type | Description |
|-------|------|-------------|
| available | boolean | Сервис доступен |
| pledges | PledgeRecord[] | Залоги |

### PledgeRecord

| Field | Type | Description |
|-------|------|-------------|
| pledgor | string | Залогодержатель |
| date | date | Дата залога |
| number | string | Номер договора |

### FsspResult

Данные из ФССП.

| Field | Type | Description |
|-------|------|-------------|
| available | boolean | Сервис доступен |
| enforcements | EnforcementRecord[] | Исп. производства |

### EnforcementRecord

| Field | Type | Description |
|-------|------|-------------|
| number | string | Номер производства |
| date | date | Дата возбуждения |
| subject | string | Предмет взыскания |
| amount | number | null | Сумма |

---

## Database Schema

```sql
-- Кэш проверок VIN
CREATE TABLE vin_checks (
  id SERIAL PRIMARY KEY,
  vin VARCHAR(17) NOT NULL,
  result JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ok',  -- ok, warning, danger
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',

  CONSTRAINT vin_format CHECK (LENGTH(vin) = 17)
);

CREATE INDEX idx_vin_checks_vin ON vin_checks(vin);
CREATE INDEX idx_vin_checks_expires ON vin_checks(expires_at) WHERE expires_at > NOW();

-- WMI справочник (производители)
CREATE TABLE vin_wmi (
  wmi VARCHAR(3) PRIMARY KEY,
  manufacturer VARCHAR(100) NOT NULL,
  country VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL
);

-- Примеры данных
INSERT INTO vin_wmi (wmi, manufacturer, country, region) VALUES
('WBA', 'BMW AG', 'Germany', 'Europe'),
('WBS', 'BMW M GmbH', 'Germany', 'Europe'),
('WDB', 'Mercedes-Benz', 'Germany', 'Europe'),
('WDD', 'Mercedes-Benz', 'Germany', 'Europe'),
('WAU', 'Audi', 'Germany', 'Europe'),
('WVW', 'Volkswagen', 'Germany', 'Europe'),
('JT', 'Toyota', 'Japan', 'Asia'),
('JN', 'Nissan', 'Japan', 'Asia'),
('JH', 'Honda', 'Japan', 'Asia'),
('JM', 'Mazda', 'Japan', 'Asia'),
('KN', 'Kia', 'South Korea', 'Asia'),
('KM', 'Hyundai', 'South Korea', 'Asia'),
('XTA', 'AvtoVAZ', 'Russia', 'Europe'),
('XW', 'Russia (various)', 'Russia', 'Europe'),
('VF', 'Renault', 'France', 'Europe'),
('ZAR', 'Alfa Romeo', 'Italy', 'Europe'),
('ZFF', 'Ferrari', 'Italy', 'Europe');
```

---

## State Transitions

### VinCheck.status

```
[new] → ok       (все проверки чистые)
[new] → warning  (есть замечания: много владельцев, старые ДТП)
[new] → danger   (критичные проблемы: розыск, залог, ограничения)
```

### Критерии статусов

| Status | Условия |
|--------|---------|
| danger | В розыске ИЛИ активный залог ИЛИ ограничения ФССП |
| warning | ДТП за последние 3 года ИЛИ >3 владельцев ИЛИ юр.лицо владелец |
| ok | Всё остальное |
