import React from 'react';
import { truncateAddress, formatDuration, formatPrice, copyToClipboard } from '../utils/utils';

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
  const handleCopyAddress = async (address: string) => {
    await copyToClipboard(address);
    // You could add a toast notification here
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

        {/* Action Button */}
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
      </div>
    </div>
  );
};

export default ServiceCard;
