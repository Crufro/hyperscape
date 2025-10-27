-- Script to promote wallet 0x62122994F6aC68d98A11B1D17249BD4930253cbB to admin
-- Run this with: docker-compose exec -T postgres psql -U asset_forge -d asset_forge < scripts/make-admin.sql

BEGIN;

-- First, add to admin whitelist for reference (if not already there)
INSERT INTO admin_whitelist (wallet_address, reason)
VALUES ('0x62122994F6aC68d98A11B1D17249BD4930253cbB', 'Primary admin account')
ON CONFLICT (wallet_address) DO NOTHING;

-- Check if user exists and update their role to admin
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM users
  WHERE wallet_address = '0x62122994F6aC68d98A11B1D17249BD4930253cbB';

  IF user_count > 0 THEN
    -- User exists, update their role
    UPDATE users
    SET role = 'admin',
        updated_at = CURRENT_TIMESTAMP
    WHERE wallet_address = '0x62122994F6aC68d98A11B1D17249BD4930253cbB';

    RAISE NOTICE 'User found and promoted to admin';
  ELSE
    RAISE NOTICE 'User not found - wallet has not signed in yet. Added to whitelist for reference.';
    RAISE NOTICE 'When user signs in, you can promote them via the admin UI or run this script again.';
  END IF;
END $$;

-- Show current status
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM users WHERE wallet_address = '0x62122994F6aC68d98A11B1D17249BD4930253cbB')
    THEN 'USER EXISTS'
    ELSE 'USER NOT FOUND (hasn''t signed in yet)'
  END as status,
  EXISTS (SELECT 1 FROM admin_whitelist WHERE wallet_address = '0x62122994F6aC68d98A11B1D17249BD4930253cbB') as in_whitelist;

-- If user exists, show their details
SELECT
  id,
  privy_user_id,
  wallet_address,
  display_name,
  email,
  role,
  created_at
FROM users
WHERE wallet_address = '0x62122994F6aC68d98A11B1D17249BD4930253cbB';

COMMIT;
