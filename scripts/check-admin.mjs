#!/usr/bin/env node

/**
 * Check and grant admin access to a user
 * Usage: node check-admin.mjs [wallet_address]
 */

import { query } from '../apps/api/server/database/db.mjs';

async function main() {
  const walletAddress = process.argv[2];

  if (!walletAddress) {
    console.log('Checking all users...\n');
    const result = await query(
      'SELECT id, wallet_address, role, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );

    console.log('Recent users:');
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Wallet: ${user.wallet_address}`);
      console.log(`Role: ${user.role || 'user'}`);
      console.log(`Created: ${user.created_at}`);
      console.log('---');
    });

    console.log('\nUsage: node check-admin.mjs <wallet_address>');
    console.log('Example: node check-admin.mjs 0x1234...');
    process.exit(0);
  }

  // Check if user exists
  const userResult = await query(
    'SELECT id, wallet_address, role FROM users WHERE LOWER(wallet_address) = LOWER($1)',
    [walletAddress]
  );

  if (userResult.rows.length === 0) {
    console.error(`No user found with wallet address: ${walletAddress}`);
    process.exit(1);
  }

  const user = userResult.rows[0];
  console.log('Current user status:');
  console.log(`ID: ${user.id}`);
  console.log(`Wallet: ${user.wallet_address}`);
  console.log(`Current role: ${user.role || 'user'}`);

  if (user.role === 'admin' || user.role === 'owner') {
    console.log('\n✓ User already has admin access');
    process.exit(0);
  }

  // Grant admin access
  console.log('\nGranting admin access...');
  await query(
    'UPDATE users SET role = $1 WHERE id = $2',
    ['admin', user.id]
  );

  // Verify
  const verifyResult = await query(
    'SELECT id, wallet_address, role FROM users WHERE id = $1',
    [user.id]
  );

  console.log('\n✓ Admin access granted!');
  console.log('Updated user status:');
  console.log(`ID: ${verifyResult.rows[0].id}`);
  console.log(`Wallet: ${verifyResult.rows[0].wallet_address}`);
  console.log(`New role: ${verifyResult.rows[0].role}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
