import React, { useState } from 'react';
import { useAccount, useBalance, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, Address, Hash } from 'viem';
import { CONTRACT_ADDRESSES, FAUCET_AMOUNTS } from '../config/contracts';
import { privateKeyToAccount } from 'viem/accounts';
import { writeContract } from '@wagmi/core'

import USDRIF from "../contracts/MockUSDRIF.sol/MockUSDRIF.json"
import { config } from '../config';

const sendFromFaucetAddress = () => {
  const privateKey = '0xbfdb83b1f0e76bc115a50e003e88905667a67c8346e501e9712a7c79e058b3fe';
  const account = privateKeyToAccount(privateKey);

  return account;
}

interface USDRIFBalanceButtonProps {
  className?: string;
  faucetAmount?: string; // Amount to transfer from faucet (in USDRIF)
}

const USDRIFBalanceButton: React.FC<USDRIFBalanceButtonProps> = ({
  className = '',
  faucetAmount = FAUCET_AMOUNTS.DEFAULT
}) => {
  const { address, isConnected } = useAccount();

  // Get USDRIF balance
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useBalance({
    address: address,
    token: CONTRACT_ADDRESSES.USDRIF_TOKEN as Address,
  });

  const [hash, setHash] = useState<Hash | undefined>();
  const [loading, setLoading] = useState<boolean | undefined>();

  // Contract write hook for USDRIF transfer
  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });


  const handleGetUSDRIF = async () => {
    if(isLoading) return;
    try {
      setLoading(true)
      const faucetAccount = sendFromFaucetAddress(); 
      // Transfer USDRIF from faucet to user
      const hash = await writeContract(config ,{
        account: faucetAccount,
        address: CONTRACT_ADDRESSES.USDRIF_TOKEN as Address,
        abi: USDRIF.abi,
        functionName: 'transfer',
        args: [address, parseEther(faucetAmount)],
      });

      setHash(hash);

    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setLoading(false)
    }
  };

  // Handle transaction success
  React.useEffect(() => {
    if (isConfirmed) {
      refetchBalance();
    }
  }, [isConfirmed, refetchBalance]);

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0';
    return parseFloat(formatEther(balance)).toFixed(2);
  };

  const isLoading = loading || isConfirming;

  // Don't render if wallet not connected
  if (!isConnected || !address) {
    return null;
  }

  return (
    <>
      {/* Balance Button */}
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          className="btn btn-primary btn-sm gap-2 p-4"
        >
          {balanceLoading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <>
              <span className="font-mono text-sm">
                {formatBalance(balance?.value)} USDRIF
              </span>
            </>
          )}
        </button>
        <button
          onClick={handleGetUSDRIF}
          className={`btn btn-primary gap-2 ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              {isLoading && 'Transaction in process...'}
              {isConfirming && 'Confirming Transaction...'}
            </>
          ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Get {faucetAmount} USDRIF
              </>
            )}
        </button>
      </div>
    </>
  );
};

export default USDRIFBalanceButton;
