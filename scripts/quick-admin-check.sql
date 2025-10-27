-- Quick admin check and grant script
-- Shows all users and their roles

SELECT
    id,
    wallet_address,
    COALESCE(role, 'user') as role,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- To grant admin access, uncomment and replace with your wallet:
-- UPDATE users SET role = 'admin' WHERE LOWER(wallet_address) = LOWER('YOUR_WALLET_HERE');

-- Verify admin was granted:
-- SELECT id, wallet_address, role FROM users WHERE role IN ('admin', 'owner');
