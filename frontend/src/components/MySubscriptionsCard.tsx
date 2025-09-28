import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useX402ClientTestnet } from '@prix0007/x402-payments-sdk';
import { truncateAddress, formatDuration, formatPrice, copyToClipboard } from '../utils/utils';
import { Address, getContract } from 'viem';

interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  owner: string;
  validityDuration: number;
  active: boolean;
}

interface Subscription {
  subscriber: string;
  serviceId: string;
  expiresAt: number;
  active: boolean;
}

interface MySubscriptionsCardProps {
  service: Service;
  onAccessService: (serviceId: string) => void;
}

const MySubscriptionsCard: React.FC<MySubscriptionsCardProps> = ({ service, onAccessService }) => {
  const { address: userAddress } = useAccount();
  const client = useX402ClientTestnet();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // (async () => {
  //
  //   const resourceId = client?.generateResourceId(`${subscription?.serviceId}/resource1`, userAddress)
  //   console.log({ subscription, resourceId })
  //   if(!userAddress || !resourceId) return;
  //   console.log({ access: await client?.checkAccess(userAddress as Address, resourceId, 3600) })
  //   console.log({ valid: await client?.hasValidAccess(userAddress as Address, resourceId) })
  // })()

  useEffect(() => {
    fetchSubscription();
  }, [service.id, userAddress, client]);

  const fetchSubscription = async () => {
    if (!userAddress || !client) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const sub = await client.getSubscription(service.id, userAddress);
      setSubscription(sub);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = async (address: string) => {
    await copyToClipboard(address);
  };

  const isExpired = subscription ? Date.now() / 1000 > subscription.expiresAt : false;
  const timeUntilExpiry = subscription ? subscription.expiresAt - Date.now() / 1000 : 0;
  const isExpiringSoon = timeUntilExpiry < 3600; // Less than 1 hour

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return null; // Don't show cards for services without active subscriptions
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="p-6">
        {/* Header with status */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 truncate pr-2">
              {service.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">Your Subscription</span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                isExpired
                  ? 'bg-red-100 text-red-800'
                  : isExpiringSoon
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
              }`}>
                {isExpired ? 'Expired' : subscription.active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-4 text-sm leading-relaxed line-clamp-3 min-h-[3.75rem]">
          {service.description}
        </p>

        {/* Subscription Details */}
        <div className="space-y-3 mb-6">
          {/* Expiry Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Status:</span>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
              isExpired
                ? 'bg-red-100 text-red-800'
                : isExpiringSoon
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
            }`}>
              {formatTimeRemaining(timeUntilExpiry)}
            </div>
          </div>

          {/* Price Paid */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Price Paid:</span>
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {formatPrice(service.price)}
            </div>
          </div>

          {/* Validity Duration */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Duration:</span>
            <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              {formatDuration(service.validityDuration)}
            </div>
          </div>

          {/* Expiry Date */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Expires:</span>
            <div className="text-sm text-gray-800">
              {new Date(subscription.expiresAt * 1000).toLocaleString()}
            </div>
          </div>

          {/* Service Owner */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-500">Service Owner:</span>
            <button
              onClick={() => handleCopyAddress(service.owner)}
              className="w-full bg-gray-50 hover:bg-gray-100 p-2 rounded border transition-colors text-left"
              title="Click to copy owner address"
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
          {/* Access Service Button */}
          <button
            onClick={() => onAccessService(service.id)}
            disabled={isExpired || !subscription.active}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              isExpired || !subscription.active
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isExpiringSoon
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isExpired ? 'Subscription Expired' :
             !subscription.active ? 'Subscription Inactive' :
             isExpiringSoon ? 'Access Service (Expiring Soon)' :
             'Access Service'}
          </button>

          {/* Renew Subscription Button */}
          {(isExpired || isExpiringSoon) && (
            <button
              onClick={() => window.location.href = `/`}
              className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-green-600 hover:bg-green-700 text-white"
            >
              Renew Subscription ({formatPrice(service.price)})
            </button>
          )}
        </div>

        {/* Warning Messages */}
        {isExpiringSoon && !isExpired && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              Your subscription is expiring soon. Consider renewing to maintain access.
            </div>
          </div>
        )}

        {isExpired && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              Your subscription has expired. Renew to regain access to this service.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySubscriptionsCard;
