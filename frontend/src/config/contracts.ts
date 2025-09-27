// Contract configuration for the X402 Payments system
import { ROOTSTOCK_TESTNET } from '@prix0007/x402-payments-sdk';

// Update these addresses with your actual deployed contract addresses
export const CONTRACT_ADDRESSES = {
  // USDRIF Token Contract Address
  USDRIF_TOKEN: ROOTSTOCK_TESTNET.contracts.usdrifToken,

  // Payment Gateway Contract Address
  PAYMENT_GATEWAY: ROOTSTOCK_TESTNET.contracts.paymentGateway,

  // Faucet/Treasury Address (for distributing test tokens)
  SENDER_PRIVATE: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef' as const,
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 31, // Rootstock Testnet
  name: 'Rootstock Testnet',
  rpcUrl: 'https://public-node.testnet.rsk.co',
  blockExplorer: 'https://explorer.testnet.rsk.co',
} as const;

// Token configuration
export const TOKEN_CONFIG = {
  USDRIF: {
    name: 'USD RIF',
    symbol: 'USDRIF',
    decimals: 18,
    address: CONTRACT_ADDRESSES.USDRIF_TOKEN,
  },
} as const;

// Default amounts for faucet
export const FAUCET_AMOUNTS = {
  DEFAULT: '10', // 100 USDRIF
  LARGE: '100',  // 1000 USDRIF for testing
} as const;
