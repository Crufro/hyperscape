-- Add wallet to admin whitelist
-- This will automatically grant admin role when user logs in

INSERT INTO admin_whitelist (wallet_address, added_by, reason)
VALUES (
  '0x62122994F6aC68d98A11B1D17249BD4930253cbB',
  'system',
  'Initial admin setup for project owner'
)
ON CONFLICT (wallet_address) DO NOTHING;

-- Also update existing user role if they already exist
UPDATE users
SET role = 'admin'
WHERE LOWER(wallet_address) = LOWER('0x62122994F6aC68d98A11B1D17249BD4930253cbB')
AND role != 'admin';

-- Verify the changes
SELECT 'Whitelist entry:' as status;
SELECT wallet_address, added_by, reason, created_at
FROM admin_whitelist
WHERE LOWER(wallet_address) = LOWER('0x62122994F6aC68d98A11B1D17249BD4930253cbB');

SELECT 'User role:' as status;
SELECT id, wallet_address, role, created_at
FROM users
WHERE LOWER(wallet_address) = LOWER('0x62122994F6aC68d98A11B1D17249BD4930253cbB');
