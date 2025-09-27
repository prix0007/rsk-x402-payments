// Main exports for the X402 SDK
export { X402Client } from './X402Client';

// Type exports
export type {
  NetworkConfig,
  Service,
  CreateServiceParams,
  UpdateServiceParams,
  PaymentProof,
  PaymentParams,
  PaymentResult,
  Subscription,
  AccessRequest,
  AccessResult,
  TransactionOptions,
  X402Config,
  ServiceCreatedEvent,
  PaymentMadeEvent,
  AccessGrantedEvent,
} from './types';

// Error exports
export {
  X402Error,
  PaymentError,
  ServiceError,
  AccessError,
} from './types';

// Configuration exports
export {
  ROOTSTOCK_MAINNET,
  ROOTSTOCK_TESTNET,
  LOCAL_NETWORK,
  NETWORKS,
  DEFAULT_CONFIG,
} from './config';

// Utility exports
export {
  generateResourceId,
  generateServiceId,
  formatUSDRIF,
  parseUSDRIF,
  isValidAddress,
  getCurrentTimestamp,
  isExpired,
  waitForTransaction,
  retry,
  parseError,
} from './utils';

// ABI exports
export {
  PAYMENT_GATEWAY_ABI,
  SERVICE_REGISTRY_ABI,
  ACCESS_CONTROL_ABI,
  USDRIF_TOKEN_ABI,
} from './abis';

// Re-export ethers for convenience
export { ethers, BigNumber } from 'ethers';
