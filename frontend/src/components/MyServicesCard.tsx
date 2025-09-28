import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Hash } from 'viem';
import { useX402ClientTestnet, UpdateServiceParams } from '@prix0007/x402-payments-sdk';
import { truncateAddress, formatDuration, formatPrice, copyToClipboard } from '../utils/utils';

interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  owner: string;
  validityDuration: number;
  isActive: boolean;
  totalPayments?: number;
  totalRevenue?: string;
}

interface MyServicesCardProps {
  service: Service;
  onServiceUpdated?: () => void;
}

const MyServicesCard: React.FC<MyServicesCardProps> = ({ service, onServiceUpdated }) => {
  const { address: userAddress } = useAccount();
  const client = useX402ClientTestnet();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateHash, setUpdateHash] = useState<Hash | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleCopyAddress = async (address: string) => {
    await copyToClipboard(address);
  };

  const handleCopyServiceId = async () => {
    await copyToClipboard(service.id);
  };

  const handleToggleActive = async () => {
    if (!userAddress || !client) {
      setUpdateError('Please connect your wallet first');
      return;
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);
      setUpdateHash(null);

      const updateParams: UpdateServiceParams = {
        serviceId: service.id,
        active: !service.isActive,
        price: client.parseUSDRIF(service.price) // Convert string price to BigNumber
      };

      // Call updateService (returns transaction hash)
      const transactionHash = await client.updateService(updateParams);

      // Set the actual transaction hash
      setUpdateHash(transactionHash as Hash);

      // Trigger refresh
      if (onServiceUpdated) {
        onServiceUpdated();
      }

    } catch (error) {
      console.error('Service update failed:', error);
      setUpdateError(error instanceof Error ? error.message : 'Service update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const isOwner = userAddress && userAddress.toLowerCase() === service.owner.toLowerCase();

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="p-6">
        {/* Header with status and ownership */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 truncate pr-2">
              {service.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">Your Service</span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                service.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {service.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
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

          {/* Stats */}
          {service.totalPayments !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Total Payments:</span>
              <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                {service.totalPayments}
              </div>
            </div>
          )}

          {service.totalRevenue && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Total Revenue:</span>
              <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {formatPrice(service.totalRevenue)}
              </div>
            </div>
          )}

          {/* Service ID */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-500">Service ID:</span>
            <button
              onClick={handleCopyServiceId}
              className="w-full bg-gray-50 hover:bg-gray-100 p-2 rounded border transition-colors text-left"
              title="Click to copy service ID"
            >
              <code className="text-xs font-mono text-gray-800 break-all leading-relaxed">
                {service.id}
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
          {isOwner && (
            <button
              onClick={handleToggleActive}
              disabled={isUpdating || !userAddress}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                isUpdating || !userAddress
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : service.isActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isUpdating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </div>
              ) : service.isActive ? (
                'Deactivate Service'
              ) : (
                'Activate Service'
              )}
            </button>
          )}

          {/* Test Service Button */}
          <button
            onClick={() => window.open(`/protected/${service.id}/resource1`, '_blank')}
            className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
          >
            Test Service Access
          </button>
        </div>

        {/* Update Status Messages */}
        {updateError && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {updateError}
          </div>
        )}

        {updateHash && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            <div className="font-medium">Service Updated Successfully!</div>
            <a
              href={`https://explorer.testnet.rsk.co/tx/${updateHash}`}
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

export default MyServicesCard;