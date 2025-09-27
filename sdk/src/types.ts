import { BigNumber, BigNumberish } from 'ethers';

// Network Configuration
export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  contracts: {
    paymentGateway: string;
    serviceRegistry: string;
    accessControl: string;
    usdrifToken: string;
  };
}

// Service Types
export interface Service {
  id: string;
  name: string;
  description: string;
  owner: string;
  price: BigNumber;
  validityDuration: number;
  endpoints: string[];
  active: boolean;
  totalPayments: number;
  totalRevenue: BigNumber;
}

export interface CreateServiceParams {
  name: string;
  description: string;
  price: BigNumberish;
  validityDuration: number;
  endpoints: string[];
}

export interface UpdateServiceParams {
  serviceId: string;
  price?: BigNumberish;
  active?: boolean;
}

// Payment Types
export interface PaymentProof {
  id: string;
  payer: string;
  recipient: string;
  amount: BigNumber;
  timestamp: number;
  resourceId: string;
  verified: boolean;
}

export interface PaymentParams {
  serviceId: string;
  resourceId?: string;
}

export interface PaymentResult {
  paymentId: string;
  transactionHash: string;
  service: Service;
  proof: PaymentProof;
}

// Subscription Types
export interface Subscription {
  subscriber: string;
  serviceId: string;
  expiresAt: number;
  active: boolean;
}

// Access Control Types
export interface AccessRequest {
  id: string;
  resourceId: string;
  requester: string;
  timestamp: number;
  granted: boolean;
}

export interface AccessResult {
  hasAccess: boolean;
  lastAccessTime?: number;
  expiresAt?: number;
}

// SDK Configuration
export interface X402Config {
  network: NetworkConfig;
  privateKey?: string;
  provider?: any; // ethers.Provider
  signer?: any; // ethers.Signer
}

// Transaction Options
export interface TransactionOptions {
  gasLimit?: BigNumberish;
  gasPrice?: BigNumberish;
  value?: BigNumberish;
}

// Event Types
export interface ServiceCreatedEvent {
  serviceId: string;
  owner: string;
  name: string;
  price: BigNumber;
}

export interface PaymentMadeEvent {
  paymentId: string;
  payer: string;
  recipient: string;
  amount: BigNumber;
  resourceId: string;
}

export interface AccessGrantedEvent {
  requestId: string;
  requester: string;
  resourceId: string;
  paymentId: string;
}

// Error Types
export class X402Error extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'X402Error';
  }
}

export class PaymentError extends X402Error {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_ERROR', details);
    this.name = 'PaymentError';
  }
}

export class ServiceError extends X402Error {
  constructor(message: string, details?: any) {
    super(message, 'SERVICE_ERROR', details);
    this.name = 'ServiceError';
  }
}

export class AccessError extends X402Error {
  constructor(message: string, details?: any) {
    super(message, 'ACCESS_ERROR', details);
    this.name = 'AccessError';
  }
}