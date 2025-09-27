import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Hash } from 'viem';
import { useX402ClientTestnet, CreateServiceParams } from '@prix0007/x402-payments-sdk';

interface ServiceFormData {
  name: string;
  description: string;
  price: string;
  validityDuration: string;
}

const ServiceCreateForm: React.FC = () => {
  const { address: userAddress, isConnected } = useAccount();
  const client = useX402ClientTestnet();
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    price: '',
    validityDuration: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createHash, setCreateHash] = useState<Hash | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !userAddress || !client) {
      setCreateError('Please connect your wallet first');
      return;
    }

    if (!formData.name || !formData.price || !formData.validityDuration) {
      setCreateError('Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);
      setCreateHash(null);

      // Prepare service parameters
      const serviceParams: CreateServiceParams = {
        name: formData.name,
        description: formData.description,
        price: client.parseUSDRIF(formData.price),
        validityDuration: parseInt(formData.validityDuration) * 3600, // Convert hours to seconds
        endpoints: [`/protected/${formData.name}/resource1`]
      };

      // Create service using SDK
      const transactionHash = await client.createService(serviceParams);

      setCreateHash(transactionHash as Hash);
      console.log('Service creation transaction:', transactionHash);

      // Reset form on success
      setFormData({
        name: '',
        description: '',
        price: '',
        validityDuration: ''
      });

    } catch (error) {
      console.error('Service creation failed:', error);
      setCreateError(error instanceof Error ? error.message : 'Service creation failed');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Create New Service</h2>

      <form onSubmit={handleCreateService} className="space-y-6">
        {/* Service Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Service Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
            placeholder="Enter service name"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            This will be used to generate a unique service ID
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
            placeholder="Describe your service..."
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
            Price (USDRIF) *
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
            placeholder="0.00"
            required
          />
        </div>

        {/* Validity Duration */}
        <div>
          <label htmlFor="validityDuration" className="block text-sm font-medium text-gray-700 mb-2">
            Validity Duration (Hours) *
          </label>
          <input
            type="number"
            id="validityDuration"
            name="validityDuration"
            value={formData.validityDuration}
            onChange={handleInputChange}
            min="1"
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
            placeholder="24"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            How long payments remain valid (in hours)
          </p>
        </div>

        {/* Wallet Connection Status */}
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800 text-sm">
              Please connect your wallet to create a service
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isCreating || !isConnected}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            isCreating || !isConnected
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isCreating ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Service...
            </div>
          ) : (
            'Create Service'
          )}
        </button>
      </form>

      {/* Error Message */}
      {createError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{createError}</p>
        </div>
      )}

      {/* Success Message */}
      {createHash && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 text-sm font-medium">Service Created Successfully!</p>
          <a
            href={`https://explorer.testnet.rsk.co/tx/${createHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-800 underline text-sm"
          >
            View Transaction on Explorer
          </a>
        </div>
      )}
    </div>
  );
};

export default ServiceCreateForm;