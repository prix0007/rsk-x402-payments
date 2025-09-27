# X402 Payments SDK

A TypeScript/JavaScript SDK for integrating X402 payments on Rootstock blockchain with USDRIF token support.

## 🚀 Features

- **Simple API**: Easy-to-use client for service creation, payment processing, and access control
- **Service Discovery**: Find and subscribe to available services
- **Payment Verification**: Cryptographic proof of payment with time-based validity
- **Access Control**: Fine-grained resource access management
- **AI Agent Ready**: Built for autonomous agent workflows
- **TypeScript Support**: Full type definitions included
- **Error Handling**: Comprehensive error types and user-friendly messages

## 📦 Installation

```bash
npm install @x402/payments-sdk
# or
yarn add @x402/payments-sdk
```

## 🏗️ Quick Start

### Basic Setup

```typescript
import { X402Client, LOCAL_NETWORK, parseUSDRIF } from '@x402/payments-sdk';

// Initialize client
const client = new X402Client({
  network: LOCAL_NETWORK, // or ROOTSTOCK_TESTNET, ROOTSTOCK_MAINNET
  privateKey: 'your-private-key-here',
});
```

### Create a Service

```typescript
const serviceId = await client.createService({
  name: 'AI Chat API',
  description: 'Premium AI chat service',
  price: parseUSDRIF('0.1'), // 0.1 USDRIF per access
  validityDuration: 3600, // 1 hour
  endpoints: ['/api/chat', '/api/premium'],
});

console.log('Service created:', serviceId);
```

### Subscribe to a Service

```typescript
const payment = await client.subscribeToService({
  serviceId: serviceId,
});

console.log('Payment successful!', payment.paymentId);
```

### Verify Access

```typescript
const userAddress = await client.getSignerAddress();
const resourceId = client.generateResourceId('AI Chat API', userAddress);

const verification = await client.verifyPayment(
  payment.paymentId,
  resourceId,
  3600 // 1 hour validity
);

console.log('Access verified:', verification.valid);
```

## 🤖 AI Agent Integration

The SDK is designed for autonomous AI agents that need to discover, pay for, and access services:

```typescript
import { X402Client } from '@x402/payments-sdk';

class AIAgent {
  private x402: X402Client;

  constructor(privateKey: string) {
    this.x402 = new X402Client({
      network: LOCAL_NETWORK,
      privateKey,
    });
  }

  async findAndUseService(serviceType: string) {
    // 1. Discover services
    const services = await this.x402.getAllServices();
    const aiService = services.find(s =>
      s.name.toLowerCase().includes(serviceType)
    );

    // 2. Subscribe and pay
    const payment = await this.x402.subscribeToService({
      serviceId: aiService.id,
    });

    // 3. Access the service
    const resourceId = this.x402.generateResourceId(
      aiService.name,
      await this.x402.getSignerAddress()
    );

    // Now you can make API calls with payment proof
    return { paymentId: payment.paymentId, resourceId };
  }
}
```

## 📋 API Reference

### Client Initialization

```typescript
interface X402Config {
  network: NetworkConfig;
  privateKey?: string;
  provider?: Provider;
  signer?: Signer;
}

const client = new X402Client(config);
```

### Service Management

```typescript
// Create service
const serviceId = await client.createService(params);

// Get service info
const service = await client.getService(serviceId);

// Update service
await client.updateService({ serviceId, price: newPrice });

// Discover services
const services = await client.getAllServices();
const ownerServices = await client.getServicesByOwner(ownerAddress);
```

### Payment Processing

```typescript
// Subscribe to service (recommended)
const payment = await client.subscribeToService({ serviceId });

// Direct payment
const payment = await client.makePayment(serviceId, resourceId);

// Verify payment
const { valid, payer } = await client.verifyPayment(paymentId, resourceId);

// Check subscription status
const hasSubscription = await client.hasActiveSubscription(user, serviceId);
```

### Access Control

```typescript
// Request access
const requestId = await client.requestAccess(resourceId, paymentId);

// Check access
const accessResult = await client.checkAccess(user, resourceId);

// Quick access check
const hasAccess = await client.hasValidAccess(user, resourceId);
```

### Utility Functions

```typescript
// Token management
const balance = await client.getBalance();
await client.approveUSDRIF(amount);

// ID generation
const resourceId = client.generateResourceId(resource, requester);
const serviceId = client.generateServiceId(serviceName);

// Formatting
const formatted = client.formatUSDRIF(amount);
const parsed = client.parseUSDRIF('1.5');
```

## 🌐 Networks

### Supported Networks

```typescript
import {
  LOCAL_NETWORK,      // Hardhat local development
  ROOTSTOCK_TESTNET,  // RSK Testnet
  ROOTSTOCK_MAINNET   // RSK Mainnet
} from '@x402/payments-sdk';
```

### Custom Network

```typescript
const customNetwork = {
  name: 'Custom Network',
  chainId: 123,
  rpcUrl: 'https://custom-rpc.com',
  contracts: {
    paymentGateway: '0x...',
    serviceRegistry: '0x...',
    accessControl: '0x...',
    usdrifToken: '0x...',
  },
};

const client = new X402Client({
  network: customNetwork,
  privateKey: 'your-key',
});
```

## 🔒 Security Best Practices

1. **Private Key Management**: Never hardcode private keys. Use environment variables or secure key management.

```typescript
const client = new X402Client({
  network: ROOTSTOCK_TESTNET,
  privateKey: process.env.PRIVATE_KEY,
});
```

2. **Payment Verification**: Always verify payments before granting access:

```typescript
const { valid, payer } = await client.verifyPayment(paymentId, resourceId);
if (!valid) {
  throw new Error('Invalid payment');
}
```

3. **Access Control**: Use resource-specific IDs and check expiry:

```typescript
const resourceId = client.generateResourceId(`${service}-${user}`, userAddress);
const accessResult = await client.checkAccess(userAddress, resourceId, customDuration);
```

## 📚 Examples

See the `examples/` directory for complete usage examples:

- **Basic Usage** (`examples/basic-usage.ts`): Service creation, payment, and access
- **AI Agent Integration** (`examples/ai-agent-integration.ts`): Autonomous agent workflows

Run examples:

```bash
npm run build
node dist/examples/basic-usage.js
node dist/examples/ai-agent-integration.js multi
```

## 🛠️ Development

### Building

```bash
npm install
npm run build
```

### Testing

```bash
npm test
```

### Type Checking

```bash
npx tsc --noEmit
```

## 🔧 Error Handling

The SDK provides specific error types:

```typescript
import { PaymentError, ServiceError, AccessError } from '@x402/payments-sdk';

try {
  await client.subscribeToService({ serviceId });
} catch (error) {
  if (error instanceof PaymentError) {
    console.log('Payment failed:', error.message);
  } else if (error instanceof ServiceError) {
    console.log('Service error:', error.message);
  }
}
```

## 📈 Monitoring and Analytics

Track service usage and payments:

```typescript
// Service analytics
const service = await client.getService(serviceId);
console.log('Total payments:', service.totalPayments);
console.log('Total revenue:', client.formatUSDRIF(service.totalRevenue));

// Payment history (via events)
// Listen to PaymentMade events for real-time monitoring
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: [docs.x402.com](https://docs.x402.com)
- **Issues**: [GitHub Issues](https://github.com/x402-payments/sdk/issues)
- **Discord**: [X402 Community](https://discord.gg/x402)

## 🎯 Roadmap

- [ ] React hooks for web integration
- [ ] WebSocket event streaming
- [ ] Batch payment processing
- [ ] Multi-token support
- [ ] Payment scheduling
- [ ] Advanced analytics dashboard

---

Built with ❤️ for the Rootstock ecosystem