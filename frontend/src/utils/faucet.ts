import { createWalletClient, http, parseEther, Address, PrivateKeyAccount } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { rootstockTestnet } from 'viem/chains';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../config/contracts';
import USDRIF from '../contracts/MockUSDRIF.sol/MockUSDRIF.json';

// Define the chain configuration for Rootstock Testnet
const rootstockTestnetChain = {
  id: NETWORK_CONFIG.chainId,
  name: NETWORK_CONFIG.name,
  nativeCurrency: {
    decimals: 18,
    name: 'Rootstock Bitcoin',
    symbol: 'RBTC',
  },
  rpcUrls: {
    default: {
      http: [NETWORK_CONFIG.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'RSK Explorer',
      url: NETWORK_CONFIG.blockExplorer,
    },
  },
  testnet: true,
} as const;

export interface FaucetTransferResult {
  success: boolean;
  hash?: string;
  error?: string;
}

/**
 * Transfers USDRIF tokens from a private key wallet to a recipient address
 * @param privateKey - The private key of the faucet wallet (with 0x prefix)
 * @param recipientAddress - The address to receive the tokens
 * @param amount - The amount of USDRIF to transfer (in tokens, not wei)
 * @returns Promise with transaction result
 */
export async function transferFromFaucet(
  privateKey: string,
  recipientAddress: Address,
  amount: string
): Promise<FaucetTransferResult> {
  try {
    // Validate inputs
    if (!privateKey.startsWith('0x')) {
      throw new Error('Private key must start with 0x');
    }

    if (!recipientAddress || recipientAddress.length !== 42) {
      throw new Error('Invalid recipient address');
    }

    // Create account from private key
    const account: PrivateKeyAccount = privateKeyToAccount(privateKey as `0x${string}`);

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: rootstockTestnetChain,
      transport: http(NETWORK_CONFIG.rpcUrl),
    });

    // Prepare transaction data
    const amountInWei = parseEther(amount);

    // Send transaction
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.USDRIF_TOKEN as Address,
      abi: USDRIF.abi,
      functionName: 'transfer',
      args: [recipientAddress, amountInWei],
    });

    console.log('Faucet transfer initiated:', {
      from: account.address,
      to: recipientAddress,
      amount: amount,
      hash: hash,
    });

    return {
      success: true,
      hash: hash,
    };

  } catch (error) {
    console.error('Faucet transfer failed:', error);

    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Gets the balance of USDRIF tokens for a given address
 * @param address - The address to check balance for
 * @returns Promise with balance in USDRIF tokens
 */
export async function getUSDRIFBalance(address: Address): Promise<string> {
  try {
    const walletClient = createWalletClient({
      chain: rootstockTestnetChain,
      transport: http(NETWORK_CONFIG.rpcUrl),
    });

    // Read balance from contract
    const balance = await walletClient.readContract({
      address: CONTRACT_ADDRESSES.USDRIF_TOKEN as Address,
      abi: USDRIF.abi,
      functionName: 'balanceOf',
      args: [address],
    });

    // Convert from wei to tokens
    const balanceInTokens = parseFloat(balance.toString()) / Math.pow(10, 18);
    return balanceInTokens.toFixed(2);

  } catch (error) {
    console.error('Failed to get USDRIF balance:', error);
    return '0';
  }
}

/**
 * Validates if a private key has sufficient USDRIF balance for faucet operations
 * @param privateKey - The private key to check
 * @param requiredAmount - The required amount in USDRIF tokens
 * @returns Promise with validation result
 */
export async function validateFaucetBalance(
  privateKey: string,
  requiredAmount: string
): Promise<{ valid: boolean; balance: string; error?: string }> {
  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const balance = await getUSDRIFBalance(account.address);
    const balanceNum = parseFloat(balance);
    const requiredNum = parseFloat(requiredAmount);

    return {
      valid: balanceNum >= requiredNum,
      balance: balance,
    };

  } catch (error) {
    return {
      valid: false,
      balance: '0',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper function to estimate gas for a USDRIF transfer
 * @param fromPrivateKey - Private key of sender
 * @param to - Recipient address
 * @param amount - Amount in USDRIF tokens
 * @returns Promise with gas estimate
 */
export async function estimateTransferGas(
  fromPrivateKey: string,
  to: Address,
  amount: string
): Promise<bigint> {
  try {
    const account = privateKeyToAccount(fromPrivateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: rootstockTestnetChain,
      transport: http(NETWORK_CONFIG.rpcUrl),
    });

    const amountInWei = parseEther(amount);

    const gasEstimate = await walletClient.estimateContractGas({
      address: CONTRACT_ADDRESSES.USDRIF_TOKEN as Address,
      abi: USDRIF.abi,
      functionName: 'transfer',
      args: [to, amountInWei],
    });

    return gasEstimate;

  } catch (error) {
    console.error('Gas estimation failed:', error);
    // Return a default gas limit if estimation fails
    return BigInt(100000);
  }
}