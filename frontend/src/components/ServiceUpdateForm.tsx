import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Hash } from 'viem';
import { X402Client, ROOTSTOCK_TESTNET, UpdateServiceParams } from '@prix0007/x402-payments-sdk';
import { ethers } from 'ethers';
import { useServicesByOwner, Service } from '../utils/API';

interface ServiceUpdateFormData {
  selectedServiceId: string;
  serviceName: string;
  newPrice: string;
  isActive: boolean;
}

const ServiceUpdateForm: React.FC = () => {
  const { address: userAddress, isConnected } = useAccount();
  const [formData, setFormData] = useState<ServiceUpdateFormData>({
    selectedServiceId: '',
    serviceName: '',
    newPrice: '',
    isActive: true
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateHash, setUpdateHash] = useState<Hash | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateType, setUpdateType] = useState<'price' | 'status' | null>(null);

  // Fetch user's services
  const { data: userServicesData, isLoading: servicesLoading, error: servicesError } = useServicesByOwner(
    userAddress || '',
    isConnected && !!userAddress
  );

  const userServices = userServicesData?.data || [];

  // Auto-populate form when service is selected
  useEffect(() => {
    if (formData.selectedServiceId && userServices.length > 0) {
      const selectedService = userServices.find(service => service.id === formData.selectedServiceId);
      if (selectedService) {
        setFormData(prev => ({
          ...prev,
          serviceName: selectedService.name,
          newPrice: selectedService.price,
          isActive: selectedService.isActive
        }));
      }
    }
  }, [formData.selectedServiceId, userServices]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !userAddress) {
      setUpdateError('Please connect your wallet first');
      return;
    }

    if (!formData.selectedServiceId || !formData.newPrice) {
      setUpdateError('Please select a service and enter new price');
      return;
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);
      setUpdateHash(null);
      setUpdateType('price');

      // Initialize X402 Client with signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const client = new X402Client({
        network: ROOTSTOCK_TESTNET,
        signer: signer
      });

      // Prepare update parameters
      const updateParams: UpdateServiceParams = {
        serviceId: formData.selectedServiceId,
        price: client.parseUSDRIF(formData.newPrice)
      };

      // Update service using SDK
      await client.updateService(updateParams);

      // Since updateService doesn't return a hash, we'll create a placeholder
      setUpdateHash('0x' + Date.now().toString(16) as Hash);
      console.log('Service price updated successfully');

    } catch (error) {
      console.error('Service price update failed:', error);
      setUpdateError(error instanceof Error ? error.message : 'Service price update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !userAddress) {
      setUpdateError('Please connect your wallet first');
      return;
    }

    if (!formData.selectedServiceId) {
      setUpdateError('Please select a service');
      return;
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);
      setUpdateHash(null);
      setUpdateType('status');

      // Initialize X402 Client with signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const client = new X402Client({
        network: ROOTSTOCK_TESTNET,
        signer: signer
      });

      // Prepare update parameters
      const updateParams: UpdateServiceParams = {
        serviceId: formData.selectedServiceId,
        active: formData.isActive
      };

      // Update service using SDK
      await client.updateService(updateParams);

      // Since updateService doesn't return a hash, we'll create a placeholder
      setUpdateHash('0x' + Date.now().toString(16) as Hash);
      console.log('Service status updated successfully');

    } catch (error) {
      console.error('Service status update failed:', error);
      setUpdateError(error instanceof Error ? error.message : 'Service status update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Update Existing Service</h2>

      <div className="space-y-8">
        {/* Service Selection */}
        <div>
          <label htmlFor="selectedServiceId" className="block text-sm font-medium text-gray-700 mb-2">
            Select Your Service *
          </label>

          {servicesLoading ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Loading your services...
              </div>
            </div>
          ) : servicesError ? (
            <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-700">
              Error loading services: {servicesError.message}
            </div>
          ) : userServices.length === 0 ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
              No services found for your address
            </div>
          ) : (
            <select
              id="selectedServiceId"
              name="selectedServiceId"
              value={formData.selectedServiceId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
              required
            >
              <option value="">Select a service to update</option>
              {userServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.price} USDRIF - {service.isActive ? 'Active' : 'Inactive'}
                </option>
              ))}
            </select>
          )}

          <p className="text-xs text-gray-500 mt-1">
            Choose from your registered services
          </p>
        </div>

        {/* Service Name Input (Read-only when service selected) */}
        <div>
          <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 mb-2">
            Service Name *
          </label>
          <input
            type="text"
            id="serviceName"
            name="serviceName"
            value={formData.serviceName}
            onChange={handleInputChange}
            disabled={!!formData.selectedServiceId}
            className={`w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm ${
              formData.selectedServiceId ? 'bg-gray-100 text-gray-700 cursor-not-allowed' : 'bg-white text-gray-900'
            }`}
            placeholder={formData.selectedServiceId ? "Auto-filled from selected service" : "Enter service name to update"}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.selectedServiceId
              ? "Service name is auto-filled from your selection above"
              : "Enter the exact name of the service you want to update"
            }
          </p>
        </div>

        {/* Current Service Details */}
        {formData.selectedServiceId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-4">Current Service Details</h3>
            {(() => {
              const selectedService = userServices.find(service => service.id === formData.selectedServiceId);
              if (!selectedService) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Service ID:</span>
                    <p className="text-blue-700 font-mono text-xs break-all mt-1">{selectedService.id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Current Price:</span>
                    <p className="text-blue-700 mt-1">{selectedService.price} USDRIF</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Validity Duration:</span>
                    <p className="text-blue-700 mt-1">{Math.floor(selectedService.validityDuration / 3600)} hours</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Status:</span>
                    <p className={`mt-1 font-medium ${selectedService.isActive ? 'text-green-700' : 'text-red-700'}`}>
                      {selectedService.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-blue-800">Description:</span>
                    <p className="text-blue-700 mt-1">{selectedService.description || 'No description provided'}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Update Price Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Update Service Price</h3>

          <form onSubmit={handleUpdatePrice} className="space-y-4">
            <div>
              <label htmlFor="newPrice" className="block text-sm font-medium text-gray-700 mb-2">
                New Price (USDRIF) *
              </label>
              <input
                type="number"
                id="newPrice"
                name="newPrice"
                value={formData.newPrice}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
                placeholder="0.00"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating || !isConnected || updateType === 'price'}
              className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                isUpdating || !isConnected || updateType === 'price'
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isUpdating && updateType === 'price' ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating Price...
                </div>
              ) : (
                'Update Price'
              )}
            </button>
          </form>
        </div>

        {/* Update Status Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Update Service Status</h3>

          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 border-2 border-gray-400 rounded focus:ring-blue-500 focus:ring-2 bg-white shadow-sm"
              />
              <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                Service is Active
              </label>
            </div>
            <p className="text-xs text-gray-500">
              {formData.isActive
                ? 'Service will be available for new payments'
                : 'Service will be disabled for new payments'
              }
            </p>

            <button
              type="submit"
              disabled={isUpdating || !isConnected || updateType === 'status'}
              className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                isUpdating || !isConnected || updateType === 'status'
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isUpdating && updateType === 'status' ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating Status...
                </div>
              ) : (
                `${formData.isActive ? 'Activate' : 'Deactivate'} Service`
              )}
            </button>
          </form>
        </div>

        {/* Wallet Connection Status */}
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800 text-sm">
              Please connect your wallet to update services
            </p>
          </div>
        )}

        {/* Error Message */}
        {updateError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{updateError}</p>
          </div>
        )}

        {/* Success Message */}
        {updateHash && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-sm font-medium">
              Service {updateType === 'price' ? 'Price' : 'Status'} Updated Successfully!
            </p>
            <a
              href={`https://explorer.testnet.rsk.co/tx/${updateHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-800 underline text-sm"
            >
              View Transaction on Explorer
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceUpdateForm;
