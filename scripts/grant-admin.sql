-- Grant admin access to wallet 0x62122994F6aC68d98A11B1D17249BD4930253cbB

-- First, check if user exists
SELECT id, wallet_address, COALESCE(role, 'user') as current_role, created_at
FROM users
WHERE LOWER(wallet_address) = LOWER('0x62122994F6aC68d98A11B1D17249BD4930253cbB');

-- Grant admin role
UPDATE users
SET role = 'admin'
WHERE LOWER(wallet_address) = LOWER('0x62122994F6aC68d98A11B1D17249BD4930253cbB');

-- Verify the update
SELECT id, wallet_address, role, created_at
FROM users
WHERE LOWER(wallet_address) = LOWER('0x62122994F6aC68d98A11B1D17249BD4930253cbB');
