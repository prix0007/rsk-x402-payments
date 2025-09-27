import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, Address, Hash, stringToHex, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';
import { writeContract } from '@wagmi/core';
import { truncateAddress, formatDuration, formatPrice, copyToClipboard } from '../utils/utils';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { config } from '../config';
import USDRIF from '../contracts/MockUSDRIF.sol/MockUSDRIF.json';
import PAYMENTGATEWAY from '../contracts/X402PaymentGateway.sol/X402PaymentGateway.json';

interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  owner: string;
  validityDuration: number;
  isActive: boolean;
}

interface ServiceCardProps {
  service: Service;
  onAccessService: (serviceId: string) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onAccessService }) => {
  const { address: userAddress } = useAccount();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseHash, setPurchaseHash] = useState<Hash | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const handleCopyAddress = async (address: string) => {
    await copyToClipboard(address);
    // You could add a toast notification here
  };

  const handlePurchaseService = async () => {
    if (!userAddress) {
      setPurchaseError('Please connect your wallet first');
      return;
    }

    try {
      setIsPurchasing(true);
      setPurchaseError(null);
      setPurchaseHash(null);

      // Convert service ID to bytes32 using keccak256 hash
      const serviceIdBytes32 = keccak256(stringToHex(service.id));

      // Generate resource ID for this payment (using service + resource1)
      const resourceString = `${service.id}/resource1`;
      const resourceIdBytes32 = keccak256(stringToHex(resourceString));

      // First approve the payment gateway to spend USDRIF tokens
      const approvalHash = await writeContract(config, {
        address: CONTRACT_ADDRESSES.USDRIF_TOKEN as Address,
        abi: USDRIF.abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.PAYMENT_GATEWAY, parseEther(service.price) * 10n],
        gas: 27000n,
      });

      console.log('Approval transaction:', approvalHash);

      // Wait a bit for approval to be mined (in a real app, you'd wait for confirmation)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Then make payment to the service via payment gateway
      const paymentHash = await writeContract(config, {
        address: CONTRACT_ADDRESSES.PAYMENT_GATEWAY as Address,
        abi: PAYMENTGATEWAY.abi,
        functionName: 'makePayment',
        args: [serviceIdBytes32, resourceIdBytes32],
      });

      setPurchaseHash(paymentHash);
      console.log('Payment transaction:', paymentHash);

    } catch (error) {
      console.error('Purchase failed:', error);
      setPurchaseError(error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="p-6">
        {/* Header with status */}
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900 truncate pr-2 flex-1">
            {service.name}
          </h2>
          <div className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            service.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {service.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-4 text-sm leading-relaxed line-clamp-3 min-h-[3.75rem]">
          {service.description}
        </p>

        {/* Service Details */}
        <div className="space-y-3 mb-6">
          {/* Price */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Price:</span>
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {formatPrice(service.price)}
            </div>
          </div>

          {/* Duration */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Validity:</span>
            <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              {formatDuration(service.validityDuration)}
            </div>
          </div>

          {/* Service ID */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-500">Service ID:</span>
            <div className="bg-gray-50 p-2 rounded border">
              <code className="text-xs font-mono text-gray-800 break-all leading-relaxed">
                {service.id}
              </code>
            </div>
          </div>

          {/* Owner Address */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-500">Owner:</span>
            <button
              onClick={() => handleCopyAddress(service.owner)}
              className="w-full bg-gray-50 hover:bg-gray-100 p-2 rounded border transition-colors text-left"
              title="Click to copy full address"
            >
              <code className="text-xs font-mono text-gray-800">
                {truncateAddress(service.owner, 8, 6)}
              </code>
              <div className="text-xs text-gray-500 mt-1">Click to copy</div>
            </button>
          </div>

          {/* API Endpoint */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-500">API Endpoint:</span>
            <div className="bg-gray-50 p-2 rounded border">
              <code className="text-xs font-mono text-gray-800 break-all leading-relaxed">
                /protected/{service.id}/resource1
              </code>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Access Service Button - Only enabled when active */}
          <button
            onClick={() => onAccessService(service.id)}
            disabled={!service.isActive}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              service.isActive
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {service.isActive ? 'Access Service' : 'Service Inactive'}
          </button>

          {/* Purchase Service Button - Only shown when inactive */}
          {!service.isActive && (
            <button
              onClick={handlePurchaseService}
              disabled={isPurchasing || !userAddress}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                isPurchasing || !userAddress
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isPurchasing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Purchasing...
                </div>
              ) : !userAddress ? (
                'Connect Wallet to Purchase'
              ) : (
                `Purchase Service (${formatPrice(service.price)})`
              )}
            </button>
          )}
        </div>

        {/* Purchase Status Messages */}
        {purchaseError && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {purchaseError}
          </div>
        )}

        {purchaseHash && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            <div className="font-medium">Purchase Successful!</div>
            <a
              href={`https://explorer.testnet.rsk.co/tx/${purchaseHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-800 underline text-xs"
            >
              View Transaction
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceCard;
