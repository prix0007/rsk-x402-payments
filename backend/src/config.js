require('dotenv').config();

const { NETWORKS, LOCAL_NETWORK, ROOTSTOCK_TESTNET, ROOTSTOCK_MAINNET } = require('@prix0007/x402-payments-sdk');

// Determine network based on environment
const getNetworkConfig = () => {
  const networkName = process.env.NETWORK || 'local';

  switch (networkName.toLowerCase()) {
    case 'mainnet':
      return ROOTSTOCK_MAINNET;
    case 'testnet':
      return ROOTSTOCK_TESTNET;
    case 'local':
    default:
      return LOCAL_NETWORK;
  }
};

const networkConfig = getNetworkConfig();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Blockchain Configuration
  privateKey: process.env.PRIVATE_KEY || '0x1111111111111111111111111111111111111111111111111111111111111111',
  rpcUrl: process.env.RPC_URL || networkConfig.rpcUrl,

  // Network Configuration from SDK
  network: networkConfig,

  // API Configuration
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};

// Debug logging
console.log('Network Config:', {
  networkName: process.env.NETWORK || 'local',
  rpcUrl: config.rpcUrl,
  chainId: networkConfig.chainId,
  name: networkConfig.name
});

module.exports = config;
