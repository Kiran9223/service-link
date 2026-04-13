-- ============================================================
-- V12: Seed thesis fairness demonstration data
-- ============================================================
-- Inserts: availability_slots → bookings → ratings
-- Updates: service_providers.total_bookings_completed
-- DO NOT manually set overall_rating (trigger handles it)
--
-- Slot dates are pre-verified against the live DB.
-- The idx_availability_no_overlap UNIQUE index on
-- (provider_id, slot_date, start_time) will not conflict.
--
-- CURRENT_DATE constraints on availability_slots are dropped
-- at the start so past dates can be inserted.
-- status = 'COMPLETED' (uppercase — V8 constraint requirement)
-- ============================================================

DO $$
DECLARE

  -- Slot IDs — Gopal (provider 3)
  v_slot_g1  INTEGER; v_slot_g2  INTEGER; v_slot_g3  INTEGER; v_slot_g4  INTEGER;
  -- Slot IDs — Grace Lee (provider 18)
  v_slot_gl1 INTEGER; v_slot_gl2 INTEGER;
  -- Slot IDs — Brock Lesnar (provider 24)
  v_slot_bl1 INTEGER; v_slot_bl2 INTEGER; v_slot_bl3 INTEGER; v_slot_bl4 INTEGER;
  -- Slot IDs — Nick Duffer (provider 25)
  v_slot_nd1 INTEGER; v_slot_nd2 INTEGER; v_slot_nd3 INTEGER; v_slot_nd4 INTEGER;
  -- Slot IDs — Rick Don (provider 27)
  v_slot_rd1 INTEGER; v_slot_rd2 INTEGER;
  -- Slot IDs — Steve Rogers (provider 34)
  v_slot_sr1 INTEGER; v_slot_sr2 INTEGER; v_slot_sr3 INTEGER; v_slot_sr4 INTEGER;

  -- Booking IDs (20 new bookings)
  v_bk_1  INTEGER; v_bk_2  INTEGER; v_bk_3  INTEGER; v_bk_4  INTEGER;
  v_bk_5  INTEGER; v_bk_6  INTEGER;
  v_bk_7  INTEGER; v_bk_8  INTEGER; v_bk_9  INTEGER; v_bk_10 INTEGER;
  v_bk_11 INTEGER; v_bk_12 INTEGER; v_bk_13 INTEGER; v_bk_14 INTEGER;
  v_bk_15 INTEGER; v_bk_16 INTEGER;
  v_bk_17 INTEGER; v_bk_18 INTEGER; v_bk_19 INTEGER; v_bk_20 INTEGER;

  -- Used for dynamic constraint dropping
  v_cname TEXT;

BEGIN

  -- ──────────────────────────────────────────────────────────
  -- Drop CURRENT_DATE constraints so past dates can be seeded
  -- ──────────────────────────────────────────────────────────
  FOR v_cname IN
    SELECT conname FROM pg_constraint
    WHERE  conrelid = 'availability_slots'::regclass
      AND  contype  = 'c'
      AND  pg_get_constraintdef(oid) LIKE '%CURRENT_DATE%'
  LOOP
    EXECUTE 'ALTER TABLE availability_slots DROP CONSTRAINT ' || quote_ident(v_cname);
  END LOOP;

  -- ──────────────────────────────────────────────────────────
  -- SECTION 1: Insert availability_slots
  -- Dates verified to not exist in DB for each provider.
  -- All use start_time='10:00', end_time='11:00'.
  -- ──────────────────────────────────────────────────────────

  -- Provider 3 (Gopal): 2026-01-10, 2026-01-17, 2026-01-24, 2026-01-31
  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (3, '2026-01-10', '10:00', '11:00', true, true) RETURNING id INTO v_slot_g1;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (3, '2026-01-17', '10:00', '11:00', true, true) RETURNING id INTO v_slot_g2;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (3, '2026-01-24', '10:00', '11:00', true, true) RETURNING id INTO v_slot_g3;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (3, '2026-01-31', '10:00', '11:00', true, true) RETURNING id INTO v_slot_g4;

  -- Provider 18 (Grace Lee): 2026-01-12, 2026-01-19
  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (18, '2026-01-12', '10:00', '11:00', true, true) RETURNING id INTO v_slot_gl1;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (18, '2026-01-19', '10:00', '11:00', true, true) RETURNING id INTO v_slot_gl2;

  -- Provider 24 (Brock Lesnar): 2026-01-10, 2026-01-17, 2026-01-24, 2026-01-31
  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (24, '2026-01-10', '10:00', '11:00', true, true) RETURNING id INTO v_slot_bl1;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (24, '2026-01-17', '10:00', '11:00', true, true) RETURNING id INTO v_slot_bl2;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (24, '2026-01-24', '10:00', '11:00', true, true) RETURNING id INTO v_slot_bl3;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (24, '2026-01-31', '10:00', '11:00', true, true) RETURNING id INTO v_slot_bl4;

  -- Provider 25 (Nick Duffer): 2026-01-15, 2026-01-22, 2026-01-29, 2026-02-05
  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (25, '2026-01-15', '10:00', '11:00', true, true) RETURNING id INTO v_slot_nd1;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (25, '2026-01-22', '10:00', '11:00', true, true) RETURNING id INTO v_slot_nd2;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (25, '2026-01-29', '10:00', '11:00', true, true) RETURNING id INTO v_slot_nd3;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (25, '2026-02-05', '10:00', '11:00', true, true) RETURNING id INTO v_slot_nd4;

  -- Provider 27 (Rick Don): 2026-01-15, 2026-01-22
  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (27, '2026-01-15', '10:00', '11:00', true, true) RETURNING id INTO v_slot_rd1;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (27, '2026-01-22', '10:00', '11:00', true, true) RETURNING id INTO v_slot_rd2;

  -- Provider 34 (Steve Rogers): 2026-01-20, 2026-01-27, 2026-02-03, 2026-02-10
  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (34, '2026-01-20', '10:00', '11:00', true, true) RETURNING id INTO v_slot_sr1;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (34, '2026-01-27', '10:00', '11:00', true, true) RETURNING id INTO v_slot_sr2;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (34, '2026-02-03', '10:00', '11:00', true, true) RETURNING id INTO v_slot_sr3;

  INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, is_available, is_booked)
  VALUES (34, '2026-02-10', '10:00', '11:00', true, true) RETURNING id INTO v_slot_sr4;

  -- ──────────────────────────────────────────────────────────
  -- SECTION 2: Insert COMPLETED bookings
  -- service_id per provider (hardcoded from verified data):
  --   3=Gopal: 2, 18=Grace Lee: 41, 24=Brock: 38,
  --   25=Nick: 39, 27=Rick: 40, 34=Steve: 46
  -- status = 'COMPLETED' (uppercase — V8 constraint)
  -- ──────────────────────────────────────────────────────────

  -- Provider 3 (Gopal, service 2) — customers 19, 20, 21, 22
  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (19, 3, 2, v_slot_g1, '2026-01-10', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    100.00, 'COMPLETED', '2026-01-10 09:00:00', '2026-01-10 11:30:00', '2026-01-09 14:00:00')
  RETURNING id INTO v_bk_1;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (20, 3, 2, v_slot_g2, '2026-01-17', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    100.00, 'COMPLETED', '2026-01-17 09:00:00', '2026-01-17 11:30:00', '2026-01-16 14:00:00')
  RETURNING id INTO v_bk_2;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (21, 3, 2, v_slot_g3, '2026-01-24', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    100.00, 'COMPLETED', '2026-01-24 09:00:00', '2026-01-24 11:30:00', '2026-01-23 14:00:00')
  RETURNING id INTO v_bk_3;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (22, 3, 2, v_slot_g4, '2026-01-31', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    100.00, 'COMPLETED', '2026-01-31 09:00:00', '2026-01-31 11:30:00', '2026-01-30 14:00:00')
  RETURNING id INTO v_bk_4;

  -- Provider 18 (Grace Lee, service 41) — customers 20, 21
  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (20, 18, 41, v_slot_gl1, '2026-01-12', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    150.00, 'COMPLETED', '2026-01-12 09:00:00', '2026-01-12 11:30:00', '2026-01-11 14:00:00')
  RETURNING id INTO v_bk_5;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (21, 18, 41, v_slot_gl2, '2026-01-19', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    150.00, 'COMPLETED', '2026-01-19 09:00:00', '2026-01-19 11:30:00', '2026-01-18 14:00:00')
  RETURNING id INTO v_bk_6;

  -- Provider 24 (Brock Lesnar, service 38) — customers 19, 20, 21, 22
  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (19, 24, 38, v_slot_bl1, '2026-01-10', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    85.00, 'COMPLETED', '2026-01-10 09:00:00', '2026-01-10 11:30:00', '2026-01-09 14:00:00')
  RETURNING id INTO v_bk_7;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (20, 24, 38, v_slot_bl2, '2026-01-17', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    85.00, 'COMPLETED', '2026-01-17 09:00:00', '2026-01-17 11:30:00', '2026-01-16 14:00:00')
  RETURNING id INTO v_bk_8;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (21, 24, 38, v_slot_bl3, '2026-01-24', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    85.00, 'COMPLETED', '2026-01-24 09:00:00', '2026-01-24 11:30:00', '2026-01-23 14:00:00')
  RETURNING id INTO v_bk_9;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (22, 24, 38, v_slot_bl4, '2026-01-31', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    85.00, 'COMPLETED', '2026-01-31 09:00:00', '2026-01-31 11:30:00', '2026-01-30 14:00:00')
  RETURNING id INTO v_bk_10;

  -- Provider 25 (Nick Duffer, service 39) — customers 20, 21, 22, 32
  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (20, 25, 39, v_slot_nd1, '2026-01-15', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    75.00, 'COMPLETED', '2026-01-15 09:00:00', '2026-01-15 11:30:00', '2026-01-14 14:00:00')
  RETURNING id INTO v_bk_11;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (21, 25, 39, v_slot_nd2, '2026-01-22', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    75.00, 'COMPLETED', '2026-01-22 09:00:00', '2026-01-22 11:30:00', '2026-01-21 14:00:00')
  RETURNING id INTO v_bk_12;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (22, 25, 39, v_slot_nd3, '2026-01-29', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    75.00, 'COMPLETED', '2026-01-29 09:00:00', '2026-01-29 11:30:00', '2026-01-28 14:00:00')
  RETURNING id INTO v_bk_13;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (32, 25, 39, v_slot_nd4, '2026-02-05', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    75.00, 'COMPLETED', '2026-02-05 09:00:00', '2026-02-05 11:30:00', '2026-02-04 14:00:00')
  RETURNING id INTO v_bk_14;

  -- Provider 27 (Rick Don, service 40) — customers 19, 32
  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (19, 27, 40, v_slot_rd1, '2026-01-15', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    200.00, 'COMPLETED', '2026-01-15 09:00:00', '2026-01-15 11:30:00', '2026-01-14 14:00:00')
  RETURNING id INTO v_bk_15;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (32, 27, 40, v_slot_rd2, '2026-01-22', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    200.00, 'COMPLETED', '2026-01-22 09:00:00', '2026-01-22 11:30:00', '2026-01-21 14:00:00')
  RETURNING id INTO v_bk_16;

  -- Provider 34 (Steve Rogers, service 46) — customers 19, 20, 21, 22
  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (19, 34, 46, v_slot_sr1, '2026-01-20', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    120.00, 'COMPLETED', '2026-01-20 09:00:00', '2026-01-20 11:30:00', '2026-01-19 14:00:00')
  RETURNING id INTO v_bk_17;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (20, 34, 46, v_slot_sr2, '2026-01-27', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    120.00, 'COMPLETED', '2026-01-27 09:00:00', '2026-01-27 11:30:00', '2026-01-26 14:00:00')
  RETURNING id INTO v_bk_18;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (21, 34, 46, v_slot_sr3, '2026-02-03', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    120.00, 'COMPLETED', '2026-02-03 09:00:00', '2026-02-03 11:30:00', '2026-02-02 14:00:00')
  RETURNING id INTO v_bk_19;

  INSERT INTO bookings (customer_id, provider_id, service_id, slot_id,
    scheduled_date, scheduled_start_time, scheduled_end_time,
    service_address, service_city, service_state, service_postal_code,
    total_price, status, confirmed_at, completed_at, requested_at)
  VALUES (22, 34, 46, v_slot_sr4, '2026-02-10', '10:00:00', '11:00:00',
    '123 Main Street', 'Fullerton', 'CA', '92831',
    120.00, 'COMPLETED', '2026-02-10 09:00:00', '2026-02-10 11:30:00', '2026-02-09 14:00:00')
  RETURNING id INTO v_bk_20;

  -- ──────────────────────────────────────────────────────────
  -- SECTION 3: Insert ratings
  -- update_provider_rating() trigger recalculates overall_rating
  -- on every INSERT — do not set overall_rating manually.
  -- ON CONFLICT (booking_id) DO NOTHING makes this re-run safe.
  --
  -- Final rating averages:
  --   Gopal  (3):  4,3 + 4,4,3,4 = 22/6 = 3.67 ★
  --   Grace  (18): 4   + 4,4     = 12/3 = 4.00 ★
  --   Brock  (24): 3   + 4,3,4,3 = 17/5 = 3.40 ★
  --   Nick   (25): 4   + 4,5,4,4 = 21/5 = 4.20 ★
  --   Rick   (27): 5   + 5,5     = 15/3 = 5.00 ★
  --   Steve  (34): 5   + 5,5,5,4 = 24/5 = 4.80 ★
  -- ──────────────────────────────────────────────────────────

  -- Existing booking 3 — customer 2, provider 3 [4 ★]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible)
  VALUES (3, 2, 3, 4, 'Good work but arrived late', true)
  ON CONFLICT (booking_id) DO NOTHING;

  -- Existing booking 4 — customer 2, provider 3 [3 ★]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible)
  VALUES (4, 2, 3, 3, 'Decent service overall', true)
  ON CONFLICT (booking_id) DO NOTHING;

  -- Existing booking 9 — customer 23, provider 24 [3 ★]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible)
  VALUES (9, 23, 24, 3, 'Average experience', true)
  ON CONFLICT (booking_id) DO NOTHING;

  -- Existing booking 10 — customer 26, provider 25 [4 ★]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible)
  VALUES (10, 26, 25, 4, 'Really happy with the service', true)
  ON CONFLICT (booking_id) DO NOTHING;

  -- Existing booking 11 — customer 28, provider 27 [5 ★]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible)
  VALUES (11, 28, 27, 5, 'Absolutely outstanding', true)
  ON CONFLICT (booking_id) DO NOTHING;

  -- Existing booking 12 — customer 29, provider 18 [4 ★]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible)
  VALUES (12, 29, 18, 4, 'Reliable and thorough', true)
  ON CONFLICT (booking_id) DO NOTHING;

  -- Existing booking 15 — customer 29, provider 34 [5 ★]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible)
  VALUES (15, 29, 34, 5, 'Incredible work, highly recommend', true)
  ON CONFLICT (booking_id) DO NOTHING;

  -- New bookings — Gopal [4, 4, 3, 4]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_1, 19, 3, 4, 'Fixed the issue quickly', true, '2026-01-10 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_2, 20, 3, 4, 'Friendly and professional', true, '2026-01-17 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_3, 21, 3, 3, 'Did the job, nothing exceptional', true, '2026-01-24 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_4, 22, 3, 4, 'Would book again', true, '2026-01-31 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  -- New bookings — Grace Lee [4, 4]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_5, 20, 18, 4, 'Good service as always', true, '2026-01-12 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_6, 21, 18, 4, 'Gets the job done', true, '2026-01-19 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  -- New bookings — Brock Lesnar [4, 3, 4, 3]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_7, 19, 24, 4, 'Did the work but slow', true, '2026-01-10 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_8, 20, 24, 3, 'Acceptable service', true, '2026-01-17 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_9, 21, 24, 4, 'Room for improvement', true, '2026-01-24 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_10, 22, 24, 3, 'Got it done eventually', true, '2026-01-31 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  -- New bookings — Nick Duffer [4, 5, 4, 4]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_11, 20, 25, 4, 'Excellent attention to detail', true, '2026-01-15 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_12, 21, 25, 5, 'Very professional', true, '2026-01-22 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_13, 22, 25, 4, 'Would recommend', true, '2026-01-29 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_14, 32, 25, 4, 'Great value for money', true, '2026-02-05 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  -- New bookings — Rick Don [5, 5]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_15, 19, 27, 5, 'Best service provider on the platform', true, '2026-01-15 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_16, 32, 27, 5, 'Went above and beyond', true, '2026-01-22 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  -- New bookings — Steve Rogers [5, 5, 5, 4]
  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_17, 19, 34, 5, 'Exceeded all expectations', true, '2026-01-20 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_18, 20, 34, 5, 'Professional and efficient', true, '2026-01-27 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_19, 21, 34, 5, 'Very impressed for a new provider', true, '2026-02-03 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  INSERT INTO ratings (booking_id, user_id, provider_id, stars, review_text, is_visible, created_at)
  VALUES (v_bk_20, 22, 34, 4, 'Top quality service', true, '2026-02-10 13:30:00')
  ON CONFLICT (booking_id) DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- SECTION 4: Set total_bookings_completed to final values
  -- increment_booking_counter() checks lowercase 'completed'
  -- but V8 uses uppercase 'COMPLETED' — trigger never fires.
  -- ──────────────────────────────────────────────────────────
  UPDATE service_providers SET total_bookings_completed = 7   WHERE user_id = 3;
  UPDATE service_providers SET total_bookings_completed = 280 WHERE user_id = 18;
  UPDATE service_providers SET total_bookings_completed = 6   WHERE user_id = 24;
  UPDATE service_providers SET total_bookings_completed = 5   WHERE user_id = 25;
  UPDATE service_providers SET total_bookings_completed = 32  WHERE user_id = 27;
  UPDATE service_providers SET total_bookings_completed = 4   WHERE user_id = 34;

END $$;
