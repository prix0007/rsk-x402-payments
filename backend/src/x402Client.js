import { X402Client } from '@prix0007/x402-payments-sdk/dist/X402Client.js';
import config from './config.js';

// Create X402 client instance using network config from SDK
let x402Client;

try {
  console.log('Initializing X402Client with:', {
    networkName: config.network.name,
    chainId: config.network.chainId,
    rpcUrl: config.rpcUrl,
    hasPrivateKey: !!config.privateKey,
    contractAddresses: config.network.contracts
  });

  // Initialize with more explicit parameters
  const clientConfig = {
    network: config.network,
    privateKey: config.privateKey
  };

  // Only add rpcUrl if it's different from network default
  if (config.rpcUrl !== config.network.rpcUrl) {
    clientConfig.rpcUrl = config.rpcUrl;
    console.log('Using custom RPC URL:', config.rpcUrl);
  }

  x402Client = new X402Client(clientConfig);

  console.log('X402Client initialized successfully');
} catch (error) {
  console.error('Failed to initialize X402Client:', error);
  console.error('Stack trace:', error.stack);
  throw error;
}

export default x402Client;