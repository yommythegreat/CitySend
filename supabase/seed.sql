-- ============================================================
-- CitySend — Seed Data
-- Run AFTER 001_citysend_schema.sql
-- ============================================================

-- ── Auth users ────────────────────────────────────────────────
-- Create these via Supabase Dashboard → Authentication → Users
-- or use the Supabase CLI: supabase auth admin create-user
--
--   admin@citysend.ca  / Admin123!   role=admin
--   driver@citysend.ca / Driver123!  role=driver
--   demo@citysend.ca   / Demo123!    role=customer
--
-- After creating, copy the UUIDs back in here if you need to
-- link drivers.user_id to their auth accounts.

-- ── Drivers ───────────────────────────────────────────────────
insert into drivers (id, name, initials, phone, email, vehicle, status, current_order_id, rating, completed_orders, joined_at)
values
  ('d0','Demo Driver',    'DD','204 555 0100','driver@citysend.ca',    '2023 Toyota Corolla — Blue',     'busy',      'CS-3026', 4.80,  47,'2025-01-15T10:00:00Z'),
  ('d1','Armen Petrossian','AP','204 555 0141','armen@citysend.ca',    '2022 Toyota Corolla — Grey',     'busy',      'CS-3009', 4.90, 312,'2024-03-12T10:00:00Z'),
  ('d2','Dmitri Volkov',  'DV','204 555 0182','dmitri@citysend.ca',   '2021 Honda Civic — White',       'available',  null,      4.80, 284,'2024-05-20T10:00:00Z'),
  ('d3','Sofia Chen',     'SC','204 555 0163','sofia@citysend.ca',    '2023 Mazda 3 — Red',             'busy',      'CS-3013', 4.95, 421,'2024-01-08T10:00:00Z'),
  ('d4','Marcus Williams','MW','204 555 0174','marcus@citysend.ca',   '2020 Ford Focus — Black',        'busy',      'CS-3010', 4.70, 198,'2024-07-15T10:00:00Z'),
  ('d5','Priya Sharma',   'PS','204 555 0155','priya.s@citysend.ca',  '2022 Hyundai Elantra — Silver',  'available',  null,      4.85, 256,'2024-04-02T10:00:00Z'),
  ('d6','Liam O''Brien',  'LO','204 555 0196','liam@citysend.ca',     '2019 Volkswagen Golf — Blue',    'offline',    null,      4.60, 143,'2024-09-10T10:00:00Z'),
  ('d7','Yuki Tanaka',    'YT','204 555 0187','yuki@citysend.ca',     '2023 Toyota Yaris — White',      'available',  null,      4.90, 189,'2024-06-25T10:00:00Z'),
  ('d8','Amara Diallo',   'AD','204 555 0128','amara@citysend.ca',    '2021 Nissan Sentra — Charcoal',  'busy',      'CS-3011', 4.75, 167,'2024-08-14T10:00:00Z')
on conflict (id) do nothing;

-- ── Orders (sample — 8 delivered, 6 active, 3 cancelled) ─────
-- price_breakdown JSON matches PriceBreakdown interface exactly.

insert into orders (id, customer_id, customer_name, pickup, dropoff, parcel, status,
  assigned_driver_id, assigned_driver_name, price_breakdown, city_id, distance_km, notes, created_at, updated_at)
values
-- Delivered orders
('CS-3001','u1','Sasha Novak',
  '{"name":"Sasha Novak","phone":"204 555 0199","address":"134 Princess St, Exchange District"}',
  '{"name":"Mei Tanaka","phone":"204 555 0148","address":"88 Osborne St, Osborne Village"}',
  '{"size":"m","desc":"Clothing parcels","fragile":false}',
  'delivered','d1','Armen Petrossian',
  '{"baseFee":14,"distanceFee":0,"sizeFee":2,"fragileFee":0,"subtotalPreTax":16,"gst":0.80,"pst":1.12,"hst":0,"qst":0,"totalTax":1.92,"subtotalWithTax":17.92,"tip":3,"total":20.92}',
  'winnipeg',4.2,'[]',now()-interval'26h',now()-interval'24h'),

('CS-3002','u3','Carlos Rivera',
  '{"name":"Carlos Rivera","phone":"204 555 0132","address":"1455 Portage Ave, St. James"}',
  '{"name":"Emma Wilson","phone":"204 555 0143","address":"2200 McPhillips St, North End"}',
  '{"size":"l","desc":"Electronics box","fragile":true}',
  'delivered','d4','Marcus Williams',
  '{"baseFee":14,"distanceFee":3.50,"sizeFee":4,"fragileFee":2,"subtotalPreTax":23.50,"gst":1.18,"pst":1.65,"hst":0,"qst":0,"totalTax":2.82,"subtotalWithTax":26.32,"tip":5,"total":31.32}',
  'winnipeg',12,'[{"id":"n1","text":"Customer requested extra care with the box.","authorName":"Admin","createdAt":"2024-01-01T00:00:00Z"}]',now()-interval'30h',now()-interval'28h'),

('CS-3003','u4','Aiko Patel',
  '{"name":"Aiko Patel","phone":"204 555 0117","address":"799 Pembina Hwy, Fort Rouge"}',
  '{"name":"James Thompson","phone":"204 555 0165","address":"55 Garry St, Downtown"}',
  '{"size":"s","desc":"Documents envelope","fragile":false}',
  'delivered','d2','Dmitri Volkov',
  '{"baseFee":14,"distanceFee":0,"sizeFee":0,"fragileFee":0,"subtotalPreTax":14,"gst":0.70,"pst":0.98,"hst":0,"qst":0,"totalTax":1.68,"subtotalWithTax":15.68,"tip":2,"total":17.68}',
  'winnipeg',3.1,'[]',now()-interval'22h',now()-interval'20h'),

-- Active orders
('CS-3009','u2','Maya Johnson',
  '{"name":"Maya Johnson","phone":"204 555 0156","address":"22 Stradbrook Ave, Osborne Village"}',
  '{"name":"Jake Kim","phone":"204 555 0189","address":"1 Portage Ave E, Downtown"}',
  '{"size":"m","desc":"Laptop bag","fragile":false}',
  'in_transit','d1','Armen Petrossian',
  '{"baseFee":14,"distanceFee":0,"sizeFee":2,"fragileFee":0,"subtotalPreTax":16,"gst":0.80,"pst":1.12,"hst":0,"qst":0,"totalTax":1.92,"subtotalWithTax":17.92,"tip":2,"total":19.92}',
  'winnipeg',2.8,'[]',now()-interval'2h',now()-interval'45m'),

('CS-3010','u5','Riya Sharma',
  '{"name":"Riya Sharma","phone":"204 555 0123","address":"2020 Portage Ave, Westwood"}',
  '{"name":"Tom Nguyen","phone":"204 555 0177","address":"890 Fermor Ave, St. Vital"}',
  '{"size":"l","desc":"Storage boxes","fragile":false}',
  'picked_up','d4','Marcus Williams',
  '{"baseFee":14,"distanceFee":5.25,"sizeFee":4,"fragileFee":0,"subtotalPreTax":23.25,"gst":1.16,"pst":1.63,"hst":0,"qst":0,"totalTax":2.79,"subtotalWithTax":26.04,"tip":0,"total":26.04}',
  'winnipeg',13,'[]',now()-interval'3h',now()-interval'1h'),

('CS-3011','u6','Oliver Grant',
  '{"name":"Oliver Grant","phone":"204 555 0144","address":"303 Stradbrook Ave, Fort Rouge"}',
  '{"name":"Nina Patel","phone":"204 555 0135","address":"1765 Main St, North End"}',
  '{"size":"m","desc":"Birthday gift box","fragile":true}',
  'assigned','d8','Amara Diallo',
  '{"baseFee":14,"distanceFee":1.75,"sizeFee":2,"fragileFee":2,"subtotalPreTax":19.75,"gst":0.99,"pst":1.38,"hst":0,"qst":0,"totalTax":2.37,"subtotalWithTax":22.12,"tip":3,"total":25.12}',
  'winnipeg',11,'[]',now()-interval'1h',now()-interval'30m'),

('CS-3026','u7','Priya Kapoor',
  '{"name":"Priya Kapoor","phone":"204 555 0112","address":"567 Wellington Crescent, River Heights"}',
  '{"name":"Alex Chen","phone":"204 555 0198","address":"88 Isabel St, West End"}',
  '{"size":"s","desc":"Medication","fragile":false}',
  'new',null,null,
  '{"baseFee":14,"distanceFee":0,"sizeFee":0,"fragileFee":0,"subtotalPreTax":14,"gst":0.70,"pst":0.98,"hst":0,"qst":0,"totalTax":1.68,"subtotalWithTax":15.68,"tip":0,"total":15.68}',
  'winnipeg',5.6,'[]',now()-interval'15m',now()-interval'15m'),

-- Cancelled order
('CS-3015','u8','Daniel Park',
  '{"name":"Daniel Park","phone":"204 555 0166","address":"99 Murray Ave, Osborne Village"}',
  '{"name":"Sam Lee","phone":"204 555 0178","address":"456 Pembina Hwy, Fort Rouge"}',
  '{"size":"s","desc":"Small package","fragile":false}',
  'cancelled',null,null,
  '{"baseFee":14,"distanceFee":0,"sizeFee":0,"fragileFee":0,"subtotalPreTax":14,"gst":0.70,"pst":0.98,"hst":0,"qst":0,"totalTax":1.68,"subtotalWithTax":15.68,"tip":0,"total":15.68}',
  'winnipeg',2.1,'[]',now()-interval'5h',now()-interval'4h')
on conflict (id) do nothing;

-- ── Receipts ──────────────────────────────────────────────────
insert into receipts (id, order_id, customer_id, customer_name, amount, tax, tip, total, payment_method, last4, brand, created_at)
values
  ('RCP-001','CS-3001','u1','Sasha Novak', 16.00, 1.92, 3.00, 20.92, 'card','4242','visa',  now()-interval'24h'),
  ('RCP-002','CS-3002','u3','Carlos Rivera',23.50, 2.82, 5.00, 31.32, 'card','1234','mastercard',now()-interval'28h'),
  ('RCP-003','CS-3003','u4','Aiko Patel',  14.00, 1.68, 2.00, 17.68, 'card','9999','visa',  now()-interval'20h')
on conflict (id) do nothing;

-- ── City configs (seed from defaults — admin can override) ────
-- Using a DO block so we can compute the JSON without a giant literal.
-- In practice, paste the CITY_CONFIGS array here or load it from your app.

insert into city_configs (city_id, config, updated_at)
values
  ('winnipeg', '{"cityId":"winnipeg","cityName":"Winnipeg","province":"Manitoba","country":"Canada","isLive":true,"launchStatus":"live","serviceHours":{"open":"08:00","close":"22:00","timezone":"America/Winnipeg","daysActive":["mon","tue","wed","thu","fri","sat","sun"]},"pricing":{"baseFee":14,"baseDistanceKm":10,"extraKmFee":1.75,"smallPackageFee":0,"mediumPackageFee":2,"largePackageFee":4,"fragileFee":2,"currency":"CAD"},"taxRates":{"gst":0.05,"pst":0.07,"hst":0,"qst":0},"supportedPackageSizes":["s","m","l"],"deliveryRules":{"maxWeightKg":15,"maxDimensionsCm":[60,45,45],"proofOfDeliveryRequired":true,"signatureRequired":false,"ageVerificationAvailable":false},"cancellationRules":{"freeWindowMinutes":5,"refundPctBeforePickup":80,"allowRefundAfterPickup":false,"refundPctAfterPickup":0,"requireReason":true},"coverageNotes":"Full coverage across Winnipeg","detectionAliases":["winnipeg"],"geocodeBbox":"-97.45,49.77,-96.95,50.05","geocodeContext":"Winnipeg, MB, Canada","mapCenter":[49.8951,-97.1384],"avgPickupMinutes":12,"onTimePercent":"98.4%"}', now()),
  ('toronto',  '{"cityId":"toronto","cityName":"Toronto","province":"Ontario","country":"Canada","isLive":false,"launchStatus":"coming-soon","pricing":{"baseFee":14,"baseDistanceKm":10,"extraKmFee":1.75,"smallPackageFee":0,"mediumPackageFee":2,"largePackageFee":4,"fragileFee":2,"currency":"CAD"},"taxRates":{"gst":0,"pst":0,"hst":0.13,"qst":0},"mapCenter":[43.6532,-79.3832]}', now()),
  ('calgary',  '{"cityId":"calgary","cityName":"Calgary","province":"Alberta","country":"Canada","isLive":false,"launchStatus":"coming-soon","pricing":{"baseFee":14,"baseDistanceKm":10,"extraKmFee":1.75,"smallPackageFee":0,"mediumPackageFee":2,"largePackageFee":4,"fragileFee":2,"currency":"CAD"},"taxRates":{"gst":0.05,"pst":0,"hst":0,"qst":0},"mapCenter":[51.0447,-114.0719]}', now()),
  ('vancouver','{"cityId":"vancouver","cityName":"Vancouver","province":"British Columbia","country":"Canada","isLive":false,"launchStatus":"coming-soon","pricing":{"baseFee":14,"baseDistanceKm":10,"extraKmFee":1.75,"smallPackageFee":0,"mediumPackageFee":2,"largePackageFee":4,"fragileFee":2,"currency":"CAD"},"taxRates":{"gst":0.05,"pst":0.07,"hst":0,"qst":0},"mapCenter":[49.2827,-123.1207]}', now()),
  ('edmonton', '{"cityId":"edmonton","cityName":"Edmonton","province":"Alberta","country":"Canada","isLive":false,"launchStatus":"coming-soon","pricing":{"baseFee":14,"baseDistanceKm":10,"extraKmFee":1.75,"smallPackageFee":0,"mediumPackageFee":2,"largePackageFee":4,"fragileFee":2,"currency":"CAD"},"taxRates":{"gst":0.05,"pst":0,"hst":0,"qst":0},"mapCenter":[53.5461,-113.4938]}', now()),
  ('ottawa',   '{"cityId":"ottawa","cityName":"Ottawa","province":"Ontario","country":"Canada","isLive":false,"launchStatus":"coming-soon","pricing":{"baseFee":14,"baseDistanceKm":10,"extraKmFee":1.75,"smallPackageFee":0,"mediumPackageFee":2,"largePackageFee":4,"fragileFee":2,"currency":"CAD"},"taxRates":{"gst":0,"pst":0,"hst":0.13,"qst":0},"mapCenter":[45.4215,-75.6972]}', now()),
  ('montreal', '{"cityId":"montreal","cityName":"Montréal","province":"Quebec","country":"Canada","isLive":false,"launchStatus":"coming-soon","pricing":{"baseFee":14,"baseDistanceKm":10,"extraKmFee":1.75,"smallPackageFee":0,"mediumPackageFee":2,"largePackageFee":4,"fragileFee":2,"currency":"CAD"},"taxRates":{"gst":0.05,"pst":0,"hst":0,"qst":0.09975},"mapCenter":[45.5017,-73.5673]}', now())
on conflict (city_id) do nothing;
