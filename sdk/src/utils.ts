import { ethers, BigNumber, BigNumberish } from 'ethers';

/**
 * Generate a deterministic resource ID
 */
export function generateResourceId(resource: string, requester: string): string {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['string', 'address'], [resource, requester])
  );
}

/**
 * Generate a deterministic service ID
 */
export function generateServiceId(serviceName: string): string {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['string'], [serviceName])
  );
}

/**
 * Format USDRIF amount for display
 */
export function formatUSDRIF(amount: BigNumberish, decimals: number = 18): string {
  return ethers.utils.formatUnits(amount, decimals);
}

/**
 * Parse USDRIF amount from string
 */
export function parseUSDRIF(amount: string, decimals: number = 18): BigNumber {
  return ethers.utils.parseUnits(amount, decimals);
}

/**
 * Check if an address is valid
 */
export function isValidAddress(address: string): boolean {
  try {
    // Convert to lowercase for validation since ethers.utils.isAddress is case-sensitive
    return ethers.utils.isAddress(address.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Normalize address to proper checksum format
 */
export function normalizeAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error('Invalid address format');
  }
  // ethers.utils.getAddress handles both lowercase and mixed case addresses
  return ethers.utils.getAddress(address.toLowerCase());
}

/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Check if a timestamp is expired
 */
export function isExpired(timestamp: number, validityDuration: number): boolean {
  return getCurrentTimestamp() > timestamp + validityDuration;
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(
  txHash: string,
  provider: ethers.providers.Provider,
  confirmations: number = 1
): Promise<ethers.providers.TransactionReceipt> {
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  if (!receipt) {
    throw new Error(`Transaction ${txHash} was not mined`);
  }
  return receipt;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Validate service creation parameters
 */
export function validateServiceParams(params: {
  name: string;
  description: string;
  price: BigNumberish;
  validityDuration: number;
  endpoints: string[];
}): void {
  if (!params.name || params.name.trim().length === 0) {
    throw new Error('Service name is required');
  }

  if (!params.description || params.description.trim().length === 0) {
    throw new Error('Service description is required');
  }

  if (BigNumber.from(params.price).lte(0)) {
    throw new Error('Service price must be greater than 0');
  }

  if (params.validityDuration <= 0) {
    throw new Error('Validity duration must be greater than 0');
  }

  if (!params.endpoints || params.endpoints.length === 0) {
    throw new Error('At least one endpoint is required');
  }
}

/**
 * Convert error to user-friendly message
 */
export function parseError(error: any): string {
  if (error.reason) return error.reason;
  if (error.message) {
    // Extract revert reason from error message
    const match = error.message.match(/reverted with reason string '(.+)'/);
    if (match) return match[1];

    // Handle common error patterns
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    if (error.message.includes('gas')) {
      return 'Transaction failed due to gas issues';
    }
    if (error.message.includes('nonce')) {
      return 'Transaction nonce error';
    }

    return error.message;
  }
  return 'Unknown error occurred';
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}