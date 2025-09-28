import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE_URL = 'https://x402.prix0007.dev';

// API response interfaces
export interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  owner: string;
  validityDuration: number;
  active: boolean;
}

export interface PaymentInfo {
  paymentId: string;
  serviceId: string;
  subscriber: string;
  amount: string;
  timestamp: string;
  isValid: boolean;
  expirationTime: string;
}

export interface PaymentRequired {
  error: string;
  code: number;
  message: string;
  payment: {
    serviceId: string;
    resourceId: string;
    serviceName: string;
    price: string;
    currency: string;
    network: string;
    validityDuration: number;
    description: string;
    contractAddresses: {
      paymentGateway: string;
      usdrifToken: string;
    };
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Query Keys
export const queryKeys = {
  services: ['services'] as const,
  service: (id: string) => ['services', id] as const,
  servicesByOwner: (owner: string) => ['services', 'owner', owner] as const,
  paymentVerification: (paymentId: string) => ['payments', 'verify', paymentId] as const,
  paymentProof: (paymentId: string) => ['payments', 'proof', paymentId] as const,
  subscription: (serviceId: string, subscriber: string) => ['payments', 'subscription', serviceId, subscriber] as const,
  protectedResource: (serviceId: string, resourceId: string) => ['x402', 'protected', serviceId, resourceId] as const,
};

// API utility functions
const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Services API Hooks
export const useServices = () => {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: () => request<ApiResponse<Service[]>>('/api/services'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useService = (serviceId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.service(serviceId),
    queryFn: () => request<Service>(`/api/services/${serviceId}`),
    enabled: enabled && !!serviceId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useServicesByOwner = (ownerAddress: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.servicesByOwner(ownerAddress),
    queryFn: () => request<ApiResponse<Service[]>>(`/api/services/owner/${ownerAddress}`),
    enabled: enabled && !!ownerAddress,
    staleTime: 5 * 60 * 1000,
  });
};

// Payments API Hooks
export const usePaymentVerification = (paymentId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.paymentVerification(paymentId),
    queryFn: () => request<PaymentInfo>(`/api/payments/verify/${paymentId}`),
    enabled: enabled && !!paymentId,
    retry: 1,
  });
};

export const usePaymentProof = (paymentId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.paymentProof(paymentId),
    queryFn: () => request<any>(`/api/payments/proof/${paymentId}`),
    enabled: enabled && !!paymentId,
    retry: 1,
  });
};

export const useSubscription = (serviceId: string, subscriber: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.subscription(serviceId, subscriber),
    queryFn: () => request<any>(`/api/payments/subscription/${serviceId}/${subscriber}`),
    enabled: enabled && !!serviceId && !!subscriber,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// X402 Protected Resources API Hook
export const useProtectedResource = (serviceId: string, resourceId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.protectedResource(serviceId, resourceId),
    queryFn: async () => {
      const url = `${BASE_URL}/api/x402/protected/${serviceId}/${resourceId}`;

      try {
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        return {
          status: response.status,
          data: data,
        };
      } catch (error) {
        console.error(`Protected resource check failed:`, error);
        throw error;
      }
    },
    enabled: enabled && !!serviceId && !!resourceId,
    retry: 1,
    staleTime: 0, // Always refetch for protected resources
  });
};

// Mutation Hooks
export const useDownloadPaymentProof = () => {
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const proof = await request<any>(`/api/payments/proof/${paymentId}`);

      // Create blob and download
      const blob = new Blob([JSON.stringify(proof, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-proof-${paymentId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return proof;
    },
  });
};

// Utility hook for invalidating queries
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateServices: () => queryClient.invalidateQueries({ queryKey: queryKeys.services }),
    invalidateService: (serviceId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.service(serviceId) }),
    invalidatePaymentVerification: (paymentId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.paymentVerification(paymentId) }),
    invalidateProtectedResource: (serviceId: string, resourceId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.protectedResource(serviceId, resourceId) }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};
