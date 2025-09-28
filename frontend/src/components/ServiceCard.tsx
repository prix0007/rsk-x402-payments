import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Hash } from 'viem';
import { useX402ClientTestnet, PaymentParams } from '@prix0007/x402-payments-sdk';
import { truncateAddress, formatDuration, formatPrice, copyToClipboard } from '../utils/utils';

interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  owner: string;
  validityDuration: number;
  active: boolean;
}

interface ServiceCardProps {
  service: Service;
  onAccessService: (serviceId: string) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onAccessService }) => {

  const { address: userAddress } = useAccount();
  const client = useX402ClientTestnet();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseHash, setPurchaseHash] = useState<Hash | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'checking' | 'approving' | 'sufficient' | null>(null);

  const handleCopyAddress = async (address: string) => {
    await copyToClipboard(address);
    // You could add a toast notification here
  };

  console.log(client?.generateResourceId(`${service.id}/resource1`, userAddress))

  const handlePurchaseService = async () => {
    if (!userAddress || !client) {
      setPurchaseError('Please connect your wallet first');
      return;
    }

    try {
      setIsPurchasing(true);
      setPurchaseError(null);
      setPurchaseHash(null);
      setApprovalStatus('checking');

      // Check current allowance
      const servicePrice = client.parseUSDRIF(service.price);
      const currentAllowance = await client.getAllowance();

      if (currentAllowance.gte(servicePrice)) {
        setApprovalStatus('sufficient');
        console.log('Sufficient allowance already exists, skipping approval');
      } else {
        setApprovalStatus('approving');
        console.log('Insufficient allowance, approval will be required');
      }

      // Generate resource ID for this payment (using service + resource1)
      const resourceId = client.generateResourceId(`${service.id}/resource1`, userAddress);

      // Prepare payment parameters
      const paymentParams: PaymentParams = {
        serviceId: service.id,
        resourceId: resourceId
      };

      // Subscribe to service using SDK (handles approval and payment automatically)
      const paymentResult = await client.subscribeToService(paymentParams);
      const accessService = await client.requestAccess(resourceId, paymentResult.paymentId)

      setPurchaseHash(paymentResult.transactionHash as Hash);
      console.log('Subscription successful:', paymentResult);
      console.log('request access service:', accessService)

    } catch (error) {
      console.error('Purchase failed:', error);
      setPurchaseError(error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
      setApprovalStatus(null);
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
            service.active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {service.active ? 'Active' : 'Inactive'}
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
            disabled={!service.active}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              service.active
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {service.active ? 'Access Service' : 'Service Inactive'}
          </button>

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
                  {approvalStatus === 'checking' ? 'Checking Allowance...' :
                   approvalStatus === 'approving' ? 'Approving Tokens...' :
                   approvalStatus === 'sufficient' ? 'Processing Payment...' :
                   'Purchasing...'
                  }
                </div>
              ) : !userAddress ? (
                'Connect Wallet to Purchase'
              ) : (
                `Purchase Service (${formatPrice(service.price)})`
              )}
            </button>
        </div>

        {/* Purchase Status Messages */}
        {approvalStatus === 'sufficient' && isPurchasing && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Sufficient allowance found, skipping approval step
            </div>
          </div>
        )}

        {approvalStatus === 'approving' && isPurchasing && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              Token approval required - please confirm in your wallet
            </div>
          </div>
        )}

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
