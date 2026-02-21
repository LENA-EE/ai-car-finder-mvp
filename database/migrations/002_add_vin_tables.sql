-- Migration: Add VIN Decoder tables
-- Run in Neon SQL Editor

-- VIN check cache
CREATE TABLE IF NOT EXISTS vin_checks (
  id SERIAL PRIMARY KEY,
  vin VARCHAR(17) NOT NULL,
  result JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ok',  -- ok, warning, danger
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',

  CONSTRAINT vin_format CHECK (LENGTH(vin) = 17)
);

CREATE INDEX IF NOT EXISTS idx_vin_checks_vin ON vin_checks(vin);
CREATE INDEX IF NOT EXISTS idx_vin_checks_expires ON vin_checks(expires_at);

-- WMI reference data (World Manufacturer Identifier)
CREATE TABLE IF NOT EXISTS vin_wmi (
  wmi VARCHAR(3) PRIMARY KEY,
  manufacturer VARCHAR(100) NOT NULL,
  country VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL
);

-- Seed WMI data (popular manufacturers)
INSERT INTO vin_wmi (wmi, manufacturer, country, region) VALUES
-- Germany
('WBA', 'BMW AG', 'Germany', 'Europe'),
('WBS', 'BMW M GmbH', 'Germany', 'Europe'),
('WBY', 'BMW AG (electric)', 'Germany', 'Europe'),
('WDB', 'Mercedes-Benz', 'Germany', 'Europe'),
('WDC', 'DaimlerChrysler', 'Germany', 'Europe'),
('WDD', 'Mercedes-Benz', 'Germany', 'Europe'),
('WDF', 'Mercedes-Benz', 'Germany', 'Europe'),
('WMW', 'MINI (BMW)', 'Germany', 'Europe'),
('WAU', 'Audi', 'Germany', 'Europe'),
('WUA', 'Audi Sport', 'Germany', 'Europe'),
('WVW', 'Volkswagen', 'Germany', 'Europe'),
('WV1', 'Volkswagen Commercial', 'Germany', 'Europe'),
('WV2', 'Volkswagen Commercial', 'Germany', 'Europe'),
('WP0', 'Porsche', 'Germany', 'Europe'),
('WP1', 'Porsche', 'Germany', 'Europe'),
('W0L', 'Opel', 'Germany', 'Europe'),
-- Japan
('JT', 'Toyota', 'Japan', 'Asia'),
('JN', 'Nissan', 'Japan', 'Asia'),
('JH', 'Honda', 'Japan', 'Asia'),
('JM', 'Mazda', 'Japan', 'Asia'),
('JF', 'Fuji Heavy Industries (Subaru)', 'Japan', 'Asia'),
('JS', 'Suzuki', 'Japan', 'Asia'),
('JA', 'Isuzu', 'Japan', 'Asia'),
('JD', 'Daihatsu', 'Japan', 'Asia'),
('JK', 'Kawasaki', 'Japan', 'Asia'),
('JL', 'Mitsubishi Fuso', 'Japan', 'Asia'),
-- South Korea
('KN', 'Kia', 'South Korea', 'Asia'),
('KM', 'Hyundai', 'South Korea', 'Asia'),
('KL', 'Daewoo/GM Korea', 'South Korea', 'Asia'),
('KP', 'SsangYong', 'South Korea', 'Asia'),
-- USA
('1G', 'General Motors', 'USA', 'North America'),
('1F', 'Ford', 'USA', 'North America'),
('1C', 'Chrysler', 'USA', 'North America'),
('1J', 'Jeep', 'USA', 'North America'),
('1L', 'Lincoln', 'USA', 'North America'),
('1N', 'Nissan USA', 'USA', 'North America'),
('1H', 'Honda USA', 'USA', 'North America'),
('2T', 'Toyota Canada', 'Canada', 'North America'),
('2H', 'Honda Canada', 'Canada', 'North America'),
('3G', 'GM Mexico', 'Mexico', 'North America'),
('3F', 'Ford Mexico', 'Mexico', 'North America'),
('3V', 'VW Mexico', 'Mexico', 'North America'),
('5T', 'Toyota USA', 'USA', 'North America'),
('5Y', 'BMW USA', 'USA', 'North America'),
('5U', 'BMW USA', 'USA', 'North America'),
-- UK
('SAJ', 'Jaguar', 'UK', 'Europe'),
('SAL', 'Land Rover', 'UK', 'Europe'),
('SAR', 'Rover', 'UK', 'Europe'),
('SCC', 'Lotus', 'UK', 'Europe'),
('SCF', 'Aston Martin', 'UK', 'Europe'),
('SDB', 'Peugeot UK', 'UK', 'Europe'),
-- France
('VF1', 'Renault', 'France', 'Europe'),
('VF3', 'Peugeot', 'France', 'Europe'),
('VF6', 'Renault Trucks', 'France', 'Europe'),
('VF7', 'Citroën', 'France', 'Europe'),
('VF8', 'Matra', 'France', 'Europe'),
('VNK', 'Toyota France', 'France', 'Europe'),
-- Italy
('ZAR', 'Alfa Romeo', 'Italy', 'Europe'),
('ZAP', 'Autobianchi', 'Italy', 'Europe'),
('ZCF', 'Iveco', 'Italy', 'Europe'),
('ZDF', 'Ferrari', 'Italy', 'Europe'),
('ZFA', 'Fiat', 'Italy', 'Europe'),
('ZFF', 'Ferrari', 'Italy', 'Europe'),
('ZHW', 'Lamborghini', 'Italy', 'Europe'),
('ZLA', 'Lancia', 'Italy', 'Europe'),
-- Sweden
('YS3', 'Saab', 'Sweden', 'Europe'),
('YV1', 'Volvo Cars', 'Sweden', 'Europe'),
('YV2', 'Volvo Trucks', 'Sweden', 'Europe'),
('YV4', 'Volvo Cars', 'Sweden', 'Europe'),
-- Russia
('XTA', 'AvtoVAZ (Lada)', 'Russia', 'Europe'),
('XTT', 'AvtoVAZ (Lada)', 'Russia', 'Europe'),
('XW8', 'GM Russia', 'Russia', 'Europe'),
('XWB', 'Hyundai Russia', 'Russia', 'Europe'),
('XWE', 'Renault Russia', 'Russia', 'Europe'),
('X7L', 'Renault Russia', 'Russia', 'Europe'),
('Z94', 'Kia Russia', 'Russia', 'Europe'),
('Z8T', 'Toyota Russia', 'Russia', 'Europe'),
-- China
('LFV', 'FAW-Volkswagen', 'China', 'Asia'),
('LSV', 'Shanghai Volkswagen', 'China', 'Asia'),
('LGX', 'BYD', 'China', 'Asia'),
('LJD', 'Geely', 'China', 'Asia'),
('LVS', 'Changan Ford', 'China', 'Asia'),
-- Czech Republic
('TMA', 'Hyundai Czech', 'Czech Republic', 'Europe'),
('TMB', 'Škoda', 'Czech Republic', 'Europe'),
-- Spain
('VSS', 'SEAT', 'Spain', 'Europe'),
-- Other
('TRU', 'Audi Hungary', 'Hungary', 'Europe'),
('UU1', 'Dacia', 'Romania', 'Europe'),
('NLE', 'Mercedes-Benz Turkey', 'Turkey', 'Europe'),
('WF0', 'Ford Germany', 'Germany', 'Europe')
ON CONFLICT (wmi) DO NOTHING;

-- Verify
SELECT 'vin_checks created' AS status, COUNT(*) AS count FROM vin_checks
UNION ALL
SELECT 'vin_wmi records', COUNT(*) FROM vin_wmi;
