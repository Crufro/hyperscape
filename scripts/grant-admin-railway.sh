#!/bin/bash

# Grant admin access via Railway
# This script connects to the Railway PostgreSQL database and grants admin role

echo "Fetching database credentials from Railway..."

# Get the DATABASE_URL from Railway
DB_URL=$(railway variables --service dairy-queen | grep DATABASE_URL | cut -d'=' -f2-)

if [ -z "$DB_URL" ]; then
    echo "Error: Could not fetch DATABASE_URL from Railway"
    echo "Make sure you're in the correct Railway project"
    exit 1
fi

echo "Listing recent users..."
PGPASSWORD=$DB_URL psql "$DB_URL" -c "SELECT id, wallet_address, role, created_at FROM users ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "Enter the wallet address to grant admin access to (or press Ctrl+C to cancel):"
read WALLET

if [ -z "$WALLET" ]; then
    echo "No wallet address provided"
    exit 1
fi

echo "Granting admin access to wallet: $WALLET"
PGPASSWORD=$DB_URL psql "$DB_URL" -c "UPDATE users SET role = 'admin' WHERE LOWER(wallet_address) = LOWER('$WALLET');"

echo "Verifying..."
PGPASSWORD=$DB_URL psql "$DB_URL" -c "SELECT id, wallet_address, role FROM users WHERE LOWER(wallet_address) = LOWER('$WALLET');"

echo ""
echo "✓ Done!"
