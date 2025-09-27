# X402 Backend API - Postman Collection

This directory contains Postman collections for testing the simplified X402 Backend API.

## Files

- **`X402-Backend-API-Simplified.postman_collection.json`** - Simplified read-only API collection (recommended)
- **`X402-Backend-API.postman_collection.json`** - Original complete API collection (legacy)
- **`X402-Environment.postman_environment.json`** - Environment variables

## Quick Start

### 1. Import Collection
1. Open Postman
2. Click "Import"
3. Select `X402-Backend-API-Simplified.postman_collection.json` (recommended)
4. Select `X402-Environment.postman_environment.json`

### 2. Set Environment
1. Click environment dropdown (top right)
2. Select "X402 Backend Environment"

### 3. Start Server
```bash
npm run dev
# or
npm run docker:up
```

### 4. Test API
1. Run "Health Check" request
2. Try the "X402 Payment Flow Example" folder

## Collection Structure (Simplified)

### 📁 Health & Info
- **Health Check** - Server status
- **API Information** - Available endpoints

### 📁 Services (Read-Only)
- **Get All Services** - Discover all available services
- **Get Service by ID** - Service details by ID
- **Get Services by Owner** - Services by wallet address

### 📁 Payments (Read-Only)
- **Verify Payment** - Check payment validity
- **Get Payment Proof** - Cryptographic proof
- **Check Subscription Status** - Active subscriptions

### 📁 X402 Protocol
- **Access Protected Resource** - Main X402 endpoint (returns 402 if payment required)

### 📁 X402 Payment Flow Example
- **Step 1: Try Access (Expect 402)** - Initial request (returns contract addresses)
- **Step 2: Make Payment via Frontend** - Payment processed by your frontend app
- **Step 3: Access Again (Should Work)** - Successful access after payment

### 📁 Error Examples
- **Missing X-User-Address Header** - 400 error
- **Invalid Service ID Format** - Validation error
- **Non-existent Endpoint** - 404 error

## Environment Variables

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `baseUrl` | `http://localhost:3000` | Server URL |
| `userAddress` | `0x742d35...` | Test wallet address |
| `serviceId` | `0x1234...` | Test service ID |
| `resourceId` | `0xabcd...` | Test resource ID |
| `paymentId` | `0xpayment...` | Test payment ID |

## X402 Protocol Testing

### Complete Flow Test
1. **Run "Step 1: Try Access"**
   - Should return `402 Payment Required`
   - Note the contract addresses and payment details in response

2. **Use Frontend App to Make Payment**
   - Use the contract addresses from Step 1
   - Interact directly with smart contracts
   - No backend API call needed for payment

3. **Run "Step 3: Access Again"**
   - Should return `200 OK` with protected content
   - Proves payment-based access control works

### Key Headers
- **`X-User-Address`** - Required for X402 protected resource endpoints
- **`Content-Type: application/json`** - Standard for API requests
- No authentication headers needed (on-chain verification)

## Expected Responses

### 402 Payment Required
```json
{
  "error": "Payment Required",
  "code": 402,
  "message": "X402 Payment Required to access this resource",
  "payment": {
    "serviceId": "0x...",
    "resourceId": "0x...",
    "serviceName": "Premium Service",
    "price": "0.1",
    "currency": "USDRIF",
    "network": "rootstock",
    "validityDuration": 3600,
    "description": "Service description",
    "contractAddresses": {
      "paymentGateway": "0x...",
      "usdrifToken": "0x..."
    }
  }
}
```

### Successful Payment Verification
```json
{
  "success": true,
  "data": {
    "valid": true,
    "payer": "0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C"
  }
}
```

### Access Granted
```json
{
  "success": true,
  "data": {
    "message": "Access granted to protected resource",
    "resourceId": "0x...",
    "serviceId": "0x...",
    "userAddress": "0x...",
    "accessExpiresAt": "2024-01-01T12:00:00Z",
    "content": {
      "title": "Protected Resource",
      "data": "This is premium content that requires payment to access.",
      "timestamp": "2024-01-01T12:00:00Z",
      "serviceInfo": {
        "name": "Premium Service",
        "description": "Premium content access"
      }
    }
  }
}
```

### Service Discovery
```json
{
  "success": true,
  "data": [
    {
      "id": "0x...",
      "name": "Premium Data API",
      "description": "High-quality financial data and analytics",
      "owner": "0x...",
      "price": "0.1",
      "validityDuration": 3600,
      "endpoints": ["/api/premium-data"],
      "active": true,
      "totalPayments": 150,
      "totalRevenue": "15.0"
    }
  ]
}
```

### Subscription Status
```json
{
  "success": true,
  "data": {
    "hasActiveSubscription": true,
    "subscriber": "0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C",
    "serviceId": "0x..."
  }
}
```

## Troubleshooting

### Server Not Responding
- Check if server is running: `curl http://localhost:3000/health`
- Start server: `npm run dev` or `npm run docker:up`

### 402 Errors
- Ensure `X-User-Address` header is set
- Check that serviceId and resourceId are valid hex strings
- Verify user hasn't already paid for the resource

### Validation Errors
- Verify request parameters match expected formats
- Check that all required headers are included
- Ensure hex string formats are correct (64 characters for IDs, 40 for addresses)

### Network Connectivity (Docker)
- If using Docker and getting network errors, try local development instead: `npm run dev`
- Check Docker logs: `npm run docker:logs`
- Ensure RPC endpoints are accessible

## API Endpoints Reference

### Health & Info
```http
GET /health
GET /api
```

### Services (Read-Only)
```http
GET /api/services
GET /api/services/:serviceId
GET /api/services/owner/:ownerAddress
```

### Payments (Read-Only)
```http
GET /api/payments/verify/:paymentId?resourceId=:resourceId
GET /api/payments/proof/:paymentId
GET /api/payments/subscription/:serviceId/:subscriberAddress
```

### X402 Protocol
```http
GET /api/x402/protected/:serviceId/:resourceId
Headers: X-User-Address: 0x...
```

## Testing Strategy

### 1. Basic Functionality
- Test health check and API info endpoints
- Verify service discovery works
- Check error handling for invalid requests

### 2. X402 Protocol Flow
- Request protected resource without payment (expect 402)
- Note contract addresses in 402 response
- Use frontend to make payment to contracts
- Request protected resource again (should succeed)

### 3. Payment Verification
- Verify valid payments return correct status
- Check subscription status for users
- Get payment proofs for audit trails

### 4. Error Scenarios
- Missing required headers
- Invalid parameter formats
- Non-existent resources
- Network connectivity issues

## Integration with Frontend

The simplified backend is designed to work with frontend applications that:

1. **Handle Payment UI** - Frontend shows payment flow to users
2. **Interact with Contracts** - Frontend calls smart contracts directly
3. **Manage User State** - Frontend tracks user payments and subscriptions
4. **Use Backend for Discovery** - Backend provides service discovery and verification

### Frontend Integration Flow
1. **Discovery**: Frontend calls `GET /api/services` to show available services
2. **Access Attempt**: Frontend calls `GET /api/x402/protected/...` to access resources
3. **Payment Required**: Backend returns 402 with contract addresses
4. **Payment**: Frontend uses contract addresses to facilitate payment
5. **Access Granted**: Frontend calls protected endpoint again to access content
6. **Verification**: Frontend can verify payments and subscriptions as needed

This architecture keeps the backend simple and focused while giving frontend applications full control over the user experience and payment flow.