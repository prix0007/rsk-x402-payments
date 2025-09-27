# X402 Payments Backend Server

Express.js backend server that implements the X402 payment protocol using the Rootstock blockchain and USDRIF token.

## Features

- 🔐 **X402 Payment Protocol** - HTTP-native payments for API access with 402 responses
- 💰 **USDRIF Integration** - Rootstock-based stablecoin payment verification
- 🛡️ **Access Control** - Payment-based resource protection
- 📊 **Service Discovery** - Browse and discover available paid services
- 🔍 **Payment Verification** - Verify payments and subscription status
- 📱 **Read-Only API** - Simple GET-based API for frontend integration

## Installation

### Local Development

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit environment variables
nano .env
```

### Docker Installation

**Requirements:**
- Docker 20.0+
- Docker Compose 2.0+
- Node.js 20+ (for running scripts)

**Quick Setup:**
```bash
# Clone and setup
git clone <repository>
cd x402-backend

# Start with Docker Compose
npm run docker:up

# Verify deployment
npm run docker:test
```

## Configuration

Set up your `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Network Configuration
# Options: local, testnet, mainnet (defaults to local)
NETWORK=local

# Blockchain Configuration
PRIVATE_KEY=0x1111111111111111111111111111111111111111111111111111111111111111
# RPC_URL will override the network default if provided
RPC_URL=http://127.0.0.1:8545

# API Configuration
API_BASE_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

**Network Configuration:**
- `local`: Uses Hardhat local network with pre-deployed contracts
- `testnet`: Uses Rootstock testnet with deployed contracts
- `mainnet`: Uses Rootstock mainnet (requires deployed contracts)

Contract addresses are automatically loaded from the X402 SDK based on the selected network.

## Usage

### Start the Server

#### Local Development
```bash
# Development mode
npm run dev

# Production mode
npm start

# Build for production deployment
npm run build

# Build with production dependencies only
npm run build:prod
```

#### Docker Deployment

**Quick Start with Docker Compose:**
```bash
# Start the backend server
npm run docker:up

# View logs
npm run docker:logs

# Stop the server
npm run docker:down
```

**Manual Docker Commands:**
```bash
# Build the Docker image
npm run docker:build

# Run container with .env file
npm run docker:run

# Or run with custom environment variables
docker run -p 3000:3000 \
  -e NETWORK=testnet \
  -e PRIVATE_KEY=your_private_key \
  x402-backend
```

**Development with Local Blockchain:**
```bash
# Start backend + local Ethereum node
npm run docker:dev

# This starts both:
# - X402 Backend on http://localhost:3000
# - Local Ethereum node on http://localhost:8545
```

**Docker Environment Variables:**
- `NETWORK`: `local`, `testnet`, or `mainnet`
- `PRIVATE_KEY`: Your wallet private key
- `RPC_URL`: Custom RPC endpoint (optional)
- `PORT`: Server port (default: 3000)
- `CORS_ORIGIN`: CORS origin (default: *)

**Health Check:**
```bash
# Check if container is healthy
docker ps

# Manual health check
curl http://localhost:3000/health

# Run automated Docker tests
npm run docker:test
```

**Complete Docker Workflow:**
```bash
# 1. Build and start the container
npm run docker:up

# 2. Test the container
npm run docker:test

# 3. View logs (optional)
npm run docker:logs

# 4. Stop the container
npm run docker:down
```

### API Endpoints

#### Health & Info
- `GET /health` - Health check
- `GET /api` - API information and documentation

#### Services (Read-Only)
- `GET /api/services` - Get all available services
- `GET /api/services/:serviceId` - Get service details by ID
- `GET /api/services/owner/:ownerAddress` - Get services by owner address

#### Payments (Read-Only)
- `GET /api/payments/verify/:paymentId?resourceId=:resourceId` - Verify payment status
- `GET /api/payments/proof/:paymentId` - Get payment cryptographic proof
- `GET /api/payments/subscription/:serviceId/:subscriberAddress` - Check subscription status

#### X402 Protocol
- `GET /api/x402/protected/:serviceId/:resourceId` - Access protected resource (returns 402 if payment required)

## X402 Protocol Usage

The backend implements a simplified X402 payment protocol focused on verification and access control. All payments and service creation should be done directly through your frontend application interacting with the smart contracts.

### Accessing Protected Resources

1. **Request protected resource** with user address header:
```bash
curl -H "X-User-Address: 0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C" \
     http://localhost:3000/api/x402/protected/serviceId/resourceId
```

2. **Receive 402 Payment Required** response if payment is needed:
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

3. **Make payment directly to contract** using your frontend application

4. **Access granted** - repeat original request to get protected content

### Service Discovery

```bash
# Get all available services
curl http://localhost:3000/api/services

# Get specific service details
curl http://localhost:3000/api/services/0x1234...

# Get services by owner
curl http://localhost:3000/api/services/owner/0x742d35...
```

### Payment Verification

```bash
# Verify a payment
curl "http://localhost:3000/api/payments/verify/paymentId?resourceId=0x..."

# Check subscription status
curl http://localhost:3000/api/payments/subscription/serviceId/userAddress
```

## Authentication

This backend server uses on-chain verification for access control. No traditional authentication tokens are required since all payments and subscriptions are verified directly on the Rootstock blockchain using the X402 SDK.

## Error Handling

The server returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid auth)
- `402` - Payment Required (X402 protocol)
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Project Structure

```
src/
├── config.js              # Configuration management
├── index.js               # Main server file
├── x402Client.js          # X402 SDK client setup
├── middleware/
│   └── validation.js      # Request validation (Zod schemas)
└── routes/
    ├── services.js        # Service management routes
    ├── payments.js        # Payment handling routes
    └── x402.js           # X402 protocol routes
```

### Build Process

The project uses JavaScript (no TypeScript compilation needed):

```bash
# Clean build
npm run build:clean

# Copy files to dist/
npm run build:copy

# Full build (clean + copy)
npm run build

# Production build (includes dependency installation)
npm run build:prod
```

**Build Output:**
- `dist/src/` - Source code
- `dist/package.json` - Dependencies
- `dist/.env.example` - Environment template

### Testing

#### Automated Tests

The backend includes comprehensive test suites:

```bash
# Run core working tests (recommended)
npm run test:core

# Run all tests (includes some with complex mocking issues)
npm test

# Run specific test suites
npm test -- tests/config.test.js       # Configuration tests
npm test -- tests/validation.test.js   # Validation middleware tests
npm test -- tests/api.test.js         # Basic API tests
npm test -- tests/routes.test.js      # Route integration tests

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

**Test Coverage:**
- ✅ **Configuration** - Network switching, environment variables (9 tests)
- ✅ **Validation** - Zod schema validation for all endpoints (22 tests)
- ✅ **API Endpoints** - Health check, API info, JSON parsing (4 tests)
- ✅ **Route Integration** - X402 protocol, validation, error handling (11 tests)

**Working Test Commands:**
```bash
# Run core working tests (46 tests passing)
npm test -- tests/config.test.js tests/validation.test.js tests/api.test.js tests/routes.test.js

# Individual test suites
npm test -- tests/config.test.js      # Configuration tests
npm test -- tests/validation.test.js  # Zod validation tests
npm test -- tests/api.test.js         # Basic API functionality
npm test -- tests/routes.test.js      # Route integration & X402 protocol
```

#### Manual Testing

Use tools like curl, Postman, or any HTTP client to test the API endpoints.

**Postman Collection:**
```bash
# Import the provided Postman collection and environment
# Files: X402-Backend-API.postman_collection.json
#        X402-Environment.postman_environment.json
```

**Collection Features:**
- ✅ **Complete API Coverage** - All endpoints included
- ✅ **Environment Variables** - Preconfigured test data
- ✅ **X402 Flow Example** - Step-by-step payment workflow
- ✅ **Error Examples** - Common error scenarios
- ✅ **Request Validation** - Proper headers and body formats

**Example Test Sequence:**
1. Check server health: `GET /health`
2. Get API info: `GET /api`
3. Create a service: `POST /api/services`
4. Try accessing protected resource: `GET /api/x402/protected/...` (expect 402)
5. Make payment: `POST /api/payments`
6. Access resource again: `GET /api/x402/protected/...` (should succeed)

**cURL Examples:**
```bash
# Health check
curl http://localhost:3000/health

# X402 protected resource (with user address)
curl -H "X-User-Address: 0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C" \
     http://localhost:3000/api/x402/protected/serviceId/resourceId

# Create service
curl -X POST http://localhost:3000/api/services \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Service","description":"Test","price":"0.1","validityDuration":3600,"endpoints":["/test"]}'
```

## Dependencies

### Runtime Dependencies
- **@prix0007/x402-payments-sdk** - X402 payments SDK
- **express** - Web framework
- **cors** - Cross-origin requests
- **helmet** - Security headers
- **zod** - Request validation
- **morgan** - HTTP logging
- **dotenv** - Environment variables

### Development Dependencies
- **jest** - Testing framework
- **supertest** - HTTP testing
- **nodemon** - Development server

### Docker Features
- **Node.js 20+** - Latest LTS runtime
- **Alpine Linux** - Lightweight container base
- **Health checks** - Container monitoring
- **Non-root user** - Security best practices
- **Multi-stage build** - Optimized image size

## License

MIT License