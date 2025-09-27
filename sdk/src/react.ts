import { useMemo } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { X402Client } from './X402Client';
import { X402Config, NetworkConfig } from './types';
import { ROOTSTOCK_TESTNET, ROOTSTOCK_MAINNET } from './config';

/**
 * Custom hook that creates and returns an X402Client instance integrated with wagmi
 * @param networkConfig - Optional network configuration (defaults to ROOTSTOCK_TESTNET)
 * @returns X402Client instance or null if wallet not connected
 */
export function useX402Client(networkConfig?: NetworkConfig): X402Client | null {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  return useMemo(() => {
    if (!isConnected || !walletClient || !publicClient || !address) {
      return null;
    }

    try {
      // Use provided network config or default to testnet
      const network = networkConfig || ROOTSTOCK_TESTNET;

      // Create ethers provider from viem public client
      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);

      // Create a custom signer that bridges wagmi/viem with ethers
      const ethersSigner = new WagmiEthersSigner(walletClient, provider, address);

      const config: X402Config = {
        network,
        signer: ethersSigner,
        provider
      };

      return new X402Client(config);
    } catch (error) {
      console.error('Failed to create X402Client:', error);
      return null;
    }
  }, [isConnected, walletClient, publicClient, networkConfig, address]);
}

/**
 * Custom Ethers Signer that uses wagmi's wallet client under the hood
 */
class WagmiEthersSigner extends ethers.Signer {
  private walletClient: any;
  private _address: string;

  constructor(walletClient: any, provider: ethers.providers.Provider, address: string) {
    super();
    this.walletClient = walletClient;
    this._address = address;
    ethers.utils.defineReadOnly(this, 'provider', provider);
  }

  async getAddress(): Promise<string> {
    return this._address;
  }

  async signMessage(message: ethers.utils.Bytes | string): Promise<string> {
    const signature = await this.walletClient.signMessage({
      message: typeof message === 'string' ? message : ethers.utils.hexlify(message),
    });
    return signature;
  }

  async signTransaction(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<string> {
    const tx = await ethers.utils.resolveProperties(transaction);

    // Convert ethers transaction to viem format
    const viemTx = {
      to: tx.to as `0x${string}`,
      value: tx.value ? BigInt(tx.value.toString()) : undefined,
      data: tx.data as `0x${string}`,
      gas: tx.gasLimit ? BigInt(tx.gasLimit.toString()) : undefined,
      gasPrice: tx.gasPrice ? BigInt(tx.gasPrice.toString()) : undefined,
    };

    const signature = await this.walletClient.signTransaction(viemTx);
    return signature;
  }

  async sendTransaction(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<ethers.providers.TransactionResponse> {
    const tx = await ethers.utils.resolveProperties(transaction);

    // Convert ethers transaction to viem format and send
    const hash = await this.walletClient.sendTransaction({
      to: tx.to as `0x${string}`,
      value: tx.value ? BigInt(tx.value.toString()) : undefined,
      data: tx.data as `0x${string}`,
      gas: tx.gasLimit ? BigInt(tx.gasLimit.toString()) : undefined,
      gasPrice: tx.gasPrice ? BigInt(tx.gasPrice.toString()) : undefined,
    });

    // Return a transaction response that ethers expects
    return this.provider!.getTransaction(hash);
  }

  connect(provider: ethers.providers.Provider): ethers.Signer {
    return new WagmiEthersSigner(this.walletClient, provider, this._address);
  }
}

/**
 * Hook specifically for Rootstock Testnet
 * @returns X402Client instance configured for Rootstock Testnet
 */
export function useX402ClientTestnet(): X402Client | null {
  return useX402Client(ROOTSTOCK_TESTNET);
}

/**
 * Hook specifically for Rootstock Mainnet
 * @returns X402Client instance configured for Rootstock Mainnet
 */
export function useX402ClientMainnet(): X402Client | null {
  return useX402Client(ROOTSTOCK_MAINNET);
}

/**
 * Hook that provides wallet connection status and X402Client
 * @param networkConfig - Optional network configuration
 * @returns Object with connection status and client instance
 */
export function useX402() {
  const { isConnected, address } = useAccount();
  const client = useX402Client();

  return {
    isConnected,
    address,
    client,
    isReady: isConnected && !!client,
  };
}