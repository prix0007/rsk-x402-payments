import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useX402ClientTestnet } from '@prix0007/x402-payments-sdk';
import { useServices } from '../utils/API';
import USDRIFBalanceButton from '../components/USDRIFBalanceButton';
import MyServicesCard from '../components/MyServicesCard';
import MySubscriptionsCard from '../components/MySubscriptionsCard';
import { formatPrice } from '../utils/utils';

interface DashboardStats {
  totalServices: number;
  activeServices: number;
  totalRevenue: string;
  totalSubscriptions: number;
  activeSubscriptions: number;
}

const Dashboard: React.FC = () => {
  const { address: userAddress, isConnected } = useAccount();
  const client = useX402ClientTestnet();
  const { isLoading: servicesLoading, error: servicesError, data: servicesData, refetch: refetchServices } = useServices();
  const [stats, setStats] = useState<DashboardStats>({
    totalServices: 0,
    activeServices: 0,
    totalRevenue: '0',
    totalSubscriptions: 0,
    activeSubscriptions: 0
  });
  const [activeTab, setActiveTab] = useState<'services' | 'subscriptions'>('services');
  const [loading, setLoading] = useState(false);

  const allServices = useMemo(() => {
    return servicesData?.data || [];
  }, [servicesData]);

  const myServices = useMemo(() => {
    if (!userAddress) return [];
    return allServices.filter(service =>
      service.owner.toLowerCase() === userAddress.toLowerCase()
    );
  }, [allServices, userAddress]);

  const mySubscribedServices = useMemo(() => {
    if (!userAddress) return [];
    // For now, we'll show all active services as potential subscriptions
    // In a real app, you'd filter based on actual subscription data
    return allServices.filter(service =>
      service.active && service.owner.toLowerCase() !== userAddress.toLowerCase()
    );
  }, [allServices, userAddress]);

  useEffect(() => {
    calculateStats();
  }, [myServices, userAddress, client]);

  const calculateStats = async () => {
    if (!userAddress || !client) return;

    try {
      setLoading(true);

      // Calculate service stats
      const totalServices = myServices.length;
      const activeServices = myServices.filter(s => s.active).length;

      // Calculate total revenue (sum of all payments to user's services)
      let totalRevenue = '0';
      let totalPayments = 0;

      for (const service of myServices) {
        if (service.totalRevenue) {
          const revenueNum = parseFloat(service.totalRevenue) || 0;
          totalRevenue = (parseFloat(totalRevenue) + revenueNum).toString();
        }
        if (service.totalPayments) {
          totalPayments += service.totalPayments;
        }
      }

      // Count active subscriptions (this would need to be implemented with actual subscription checking)
      let activeSubscriptions = 0;
      try {
        for (const service of mySubscribedServices) {
          const hasSubscription = await client.hasActiveSubscription(userAddress, service.id);
          if (hasSubscription) {
            activeSubscriptions++;
          }
        }
      } catch (error) {
        console.warn('Error checking subscriptions:', error);
      }

      setStats({
        totalServices,
        activeServices,
        totalRevenue,
        totalSubscriptions: mySubscribedServices.length,
        activeSubscriptions
      });

    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessService = async (serviceId: string) => {
    const resourceId = client?.generateResourceId(`${serviceId}/resource1`, userAddress)
    const url = `https://x402.prix0007.dev/api/x402/protected/${serviceId}/${resourceId}`
    try {
      const res = await fetch(url, { headers: { "X-User-Address": userAddress ?? "" }})
      const json = await res.json()
      alert(JSON.stringify(json?.data))
    } catch(e) {
      console.error(e)
    }
  };

  const handleServiceUpdated = () => {
    refetchServices();
    calculateStats();
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="text-yellow-800 text-lg font-medium mb-2">
                Wallet Not Connected
              </div>
              <p className="text-yellow-700 mb-4">
                Please connect your wallet to view your dashboard and manage your services.
              </p>
              <div className="flex justify-center">
                <USDRIFBalanceButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (servicesLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-gray-600">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (servicesError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="text-red-800 text-lg font-medium mb-2">Error Loading Dashboard</div>
            <p className="text-red-700">{servicesError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Manage your services and subscriptions</p>
        </div>
        <USDRIFBalanceButton className="mt-2" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Services</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalServices}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">{stats.activeServices} active</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">Active subscriptions</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Services</p>
              <p className="text-2xl font-bold text-gray-900">{mySubscribedServices.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 max-w-md">
        <button
          onClick={() => setActiveTab('services')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'services'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Services ({myServices.length})
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'subscriptions'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Subscriptions ({stats.activeSubscriptions})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'services' ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">My Services</h2>
            <button
              onClick={() => window.location.href = '/manage'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Create New Service
            </button>
          </div>

          {myServices.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No services yet</h3>
                <p className="text-gray-600 mb-4">Create your first service to start earning with X402 payments.</p>
                <button
                  onClick={() => window.location.href = '/manage'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Service
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myServices.map((service) => (
                <MyServicesCard
                  key={service.id}
                  service={service}
                  onServiceUpdated={handleServiceUpdated}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">My Subscriptions</h2>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Discover Services
            </button>
          </div>

          {mySubscribedServices.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions yet</h3>
                <p className="text-gray-600 mb-4">Subscribe to services to access premium content and features.</p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Discover Services
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mySubscribedServices.map((service) => (
                <MySubscriptionsCard
                  key={service.id}
                  service={service}
                  onAccessService={handleAccessService}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
