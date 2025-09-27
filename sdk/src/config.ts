import { NetworkConfig } from './types';

// Rootstock Networks
export const ROOTSTOCK_MAINNET: NetworkConfig = {
  name: 'Rootstock Mainnet',
  chainId: 30,
  rpcUrl: 'https://public-node.rsk.co',
  contracts: {
    paymentGateway: '0x0000000000000000000000000000000000000000', // Deploy address
    serviceRegistry: '0x0000000000000000000000000000000000000000', // Deploy address
    accessControl: '0x0000000000000000000000000000000000000000', // Deploy address
    usdrifToken: '0x0000000000000000000000000000000000000000', // Real USDRIF address
  },
};

export const ROOTSTOCK_TESTNET: NetworkConfig = {
  name: 'Rootstock Testnet',
  chainId: 31,
  rpcUrl: 'https://public-node.testnet.rsk.co',
  contracts: {
    paymentGateway: '0x0000000000000000000000000000000000000000', // Deploy address
    serviceRegistry: '0x0000000000000000000000000000000000000000', // Deploy address
    accessControl: '0x0000000000000000000000000000000000000000', // Deploy address
    usdrifToken: '0x0000000000000000000000000000000000000000', // Test USDRIF address
  },
};

// Local Development (Hardhat)
export const LOCAL_NETWORK: NetworkConfig = {
  name: 'Local Development',
  chainId: 31337,
  rpcUrl: 'http://127.0.0.1:8545',
  contracts: {
    paymentGateway: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Local deploy
    serviceRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // Local deploy
    accessControl: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Local deploy
    usdrifToken: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', // Local MockUSDRIF
  },
};

// Network registry
export const NETWORKS: Record<string, NetworkConfig> = {
  mainnet: ROOTSTOCK_MAINNET,
  testnet: ROOTSTOCK_TESTNET,
  local: LOCAL_NETWORK,
};

// Default configuration
export const DEFAULT_CONFIG = {
  network: LOCAL_NETWORK,
  gasLimit: 500000,
  gasPrice: '60000000', // 60 Gwei for Rootstock
  validityDuration: 3600, // 1 hour default
  minPayment: '1000000000000000', // 0.001 USDRIF
};