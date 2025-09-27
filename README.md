# X402 USDRIF SDK

A lightweight SDK for implementing x402 payments with USDRIF on the Rootstock blockchain. This SDK enables seamless HTTP-based payments using the x402 protocol with USDRIF stablecoin.

## Features

- 🔄 **Automatic Payment Handling**: Seamlessly handle 402 Payment Required responses
- 💰 **USDRIF Integration**: Native support for USDRIF stablecoin on Rootstock
- 🚀 **Lightweight**: Minimal dependencies and easy integration
- 🤖 **AI Agent Ready**: Perfect for autonomous payment-enabled applications
- 🔒 **Secure**: Built on Rootstock's Bitcoin-secured infrastructure

## Installation

```bash
npm install x402-usdrif-sdk
```

## Quick Start

### Client Usage

```typescript
import { createTestnetClient } from 'x402-usdrif-sdk';

const client = createTestnetClient('your-private-key');

// Automatic payment handling
const response = await client.makeRequest('https://api.example.com/data', {
  autoPayment: true
});
```

### Server Middleware

```typescript
import express from 'express';
import { createX402Middleware } from 'x402-usdrif-sdk';

const app = express();

const middleware = createX402Middleware({
  usdrifContractAddress: '0x3A15461d8aE0f0fB5fa2629e9da7D23fB8b99557',
  rpcUrl: 'https://public-node.testnet.rsk.co',
  paymentAmount: '1.0',
  recipientAddress: '0xYourAddress'
});

app.use('/premium', middleware);
```

## API Reference

### X402Client

#### Constructor Options

```typescript
interface X402Config {
  rpcUrl: string;
  chainId: number;
  usdrifContractAddress: string;
  privateKey?: string;
}
```

#### Methods

- `makeRequest(url, options)` - Make HTTP request with automatic payment handling
- `processPayment(paymentRequest)` - Manually process a payment
- `getBalance()` - Get USDRIF balance
- `getTokenInfo()` - Get USDRIF token information

### Server Middleware

#### Configuration

```typescript
interface X402MiddlewareOptions {
  usdrifContractAddress: string;
  rpcUrl: string;
  paymentAmount: string;
  recipientAddress: string;
  requiredEndpoints?: string[];
}
```

## Network Configuration

### Rootstock Mainnet
- Chain ID: 30
- RPC URL: https://public-node.rsk.co
- USDRIF Contract: `0x3A15461d8aE0f0fB5fa2629e9da7D23fB8b99557` (placeholder)

### Rootstock Testnet
- Chain ID: 31
- RPC URL: https://public-node.testnet.rsk.co
- USDRIF Contract: `0x3A15461d8aE0f0fB5fa2629e9da7D23fB8b99557` (placeholder)

## Examples

### AI Agent Integration

```typescript
import { createTestnetClient } from 'x402-usdrif-sdk';

class PaymentEnabledAgent {
  private client = createTestnetClient(process.env.PRIVATE_KEY);

  async queryAPI(query: string) {
    return await this.client.makeRequest('https://ai-api.com/query', {
      method: 'POST',
      data: { query },
      autoPayment: true
    });
  }
}
```

### Manual Payment Handling

```typescript
try {
  const response = await client.makeRequest(url, { autoPayment: false });
} catch (error) {
  if (error.response?.status === 402) {
    const payment = await client.processPayment({
      amount: '1.0',
      recipient: error.response.headers['x-402-payment-recipient']
    });
    console.log('Payment sent:', payment.transactionHash);
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run example
npm run dev
```

## X402 Protocol

The x402 protocol extends HTTP with payment capabilities:

1. Client makes HTTP request
2. Server responds with `402 Payment Required` and payment details
3. Client processes payment using USDRIF
4. Client retries request with payment proof
5. Server validates payment and serves content

## USDRIF Stablecoin

USDRIF is a USD-pegged stablecoin on Rootstock:

- **1:1 USD Peg**: Each USDRIF = $1 USD
- **Over-collateralized**: Backed by RIF tokens
- **Decentralized**: Fully on-chain protocol
- **Bitcoin Security**: Secured by Bitcoin's hashpower via Rootstock

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [Rootstock Documentation](https://docs.rootstock.io)
- [USDRIF Information](https://rootstock.io/blog/new-stablecoin-protocol-launched-on-rootstock-introducing-usdrif/)
- [X402 Protocol](https://www.coinbase.com/developer-platform/discover/launches/x402)