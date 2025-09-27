# X402 Payment System Tests

This directory contains comprehensive tests for the X402 payment system smart contracts.

## Test Structure

### Individual Contract Tests

1. **`X402PaymentGateway.test.js`** - Core payment processing
   - Service registration and management
   - Payment processing and verification
   - USDRIF token integration
   - Access authorization

2. **`X402AccessControl.test.js`** - Access management
   - Access request handling
   - Payment-based authorization
   - Time-based access expiry
   - Multi-resource access patterns

3. **`X402ServiceRegistry.test.js`** - Service management
   - Service creation and discovery
   - Subscription handling
   - Revenue tracking and analytics
   - Service lifecycle management

### Integration Tests

4. **`Integration.test.js`** - End-to-end workflows
   - Complete AI agent payment flow
   - Service provider revenue tracking
   - Multi-user scenarios
   - Cross-contract interactions

## Running Tests

### Basic Test Execution
```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/X402PaymentGateway.test.js

# Run with verbose output
npm run test:verbose
```

### Gas Analysis
```bash
# Run tests with gas reporting
npm run test:gas
```

### Coverage Analysis
```bash
# Generate test coverage report
npm run coverage
```

## Test Scenarios Covered

### Payment Gateway Tests
- ✅ Service registration with pricing
- ✅ Payment processing with USDRIF
- ✅ Payment verification and validation
- ✅ Service status management
- ✅ Authorization controls
- ✅ Error handling and edge cases

### Access Control Tests
- ✅ Access request creation
- ✅ Payment-based access granting
- ✅ Time-based access expiry
- ✅ Multi-resource access management
- ✅ Invalid payment rejection
- ✅ Access verification patterns

### Service Registry Tests
- ✅ Service creation and metadata
- ✅ Service discovery and listing
- ✅ Subscription management
- ✅ Revenue and payment tracking
- ✅ Service updates and lifecycle
- ✅ Multi-provider scenarios

### Integration Tests
- ✅ AI agent complete workflow
- ✅ Service provider setup and revenue
- ✅ Multi-user service access
- ✅ Premium service upgrades
- ✅ Service deactivation/reactivation
- ✅ Cross-contract payment flows

## Test Data

### Default Test Configuration
```javascript
const SERVICE_PRICE = ethers.parseEther("1.0");     // 1 USDRIF
const PREMIUM_PRICE = ethers.parseEther("2.0");     // 2 USDRIF
const VALIDITY_DURATION = 3600;                     // 1 hour
```

### Test Accounts
- `owner` - Contract deployer
- `serviceOwner` - API service provider
- `apiProvider` - Service creator
- `aiAgent` - AI agent user
- `user` - Regular user
- `otherUser` - Additional user for multi-user tests

## Gas Optimization Notes

The contracts are optimized for:
- Minimal storage reads/writes
- Efficient event emission
- Batched operations where possible
- Gas-efficient data structures

## Security Test Coverage

- ✅ Access control enforcement
- ✅ Reentrancy protection
- ✅ Integer overflow/underflow
- ✅ Invalid input handling
- ✅ Authorization boundary testing
- ✅ Time manipulation resistance

## Local Testing

1. **Start local Hardhat network:**
   ```bash
   npm run node
   ```

2. **Deploy contracts locally:**
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Run tests against local deployment:**
   ```bash
   npm test
   ```

## Test Best Practices

1. **Isolation** - Each test is independent with fresh contract deployments
2. **Comprehensive** - Tests cover happy path, edge cases, and error conditions
3. **Readable** - Clear test descriptions and organized test structure
4. **Performance** - Efficient test execution with proper setup/teardown
5. **Realistic** - Test scenarios mirror real-world usage patterns

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Add comprehensive error condition testing
3. Include gas usage considerations
4. Update this README with new test scenarios
5. Ensure tests pass consistently across multiple runs