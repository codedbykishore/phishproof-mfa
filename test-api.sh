#!/bin/bash

echo "Testing PhishProof MFA Banking API endpoints..."

# Test password login
echo "1. Testing password login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"kishore","password":"password"}')

echo "Login response: $LOGIN_RESPONSE"

# Test dashboard without auth
echo -e "\n2. Testing dashboard without authentication..."
DASHBOARD_RESPONSE=$(curl -s -X GET http://localhost:3000/api/dashboard)
echo "Dashboard response (no auth): $DASHBOARD_RESPONSE"

# Test transfer without auth  
echo -e "\n3. Testing transfer without authentication..."
TRANSFER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount":100.50,"description":"Test transfer"}')
echo "Transfer response (no auth): $TRANSFER_RESPONSE"

# Test audit without auth
echo -e "\n4. Testing audit without authentication..."
AUDIT_RESPONSE=$(curl -s -X GET http://localhost:3000/api/audit)
echo "Audit response (no auth): $AUDIT_RESPONSE"

echo -e "\n✅ API endpoint testing complete!"