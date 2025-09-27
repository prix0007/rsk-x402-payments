const BASE_URL = 'http://65.108.63.163:3000';

// API response interfaces
export interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  owner: string;
  validityDuration: number;
  isActive: boolean;
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

// API utility class
class API {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

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
  }

  // Services API
  async getServices(): Promise<ApiResponse<Service[]>> {
    return this.request<ApiResponse<Service[]>>('/api/services');
  }

  async getService(serviceId: string): Promise<Service> {
    return this.request<Service>(`/api/services/${serviceId}`);
  }

  async getServicesByOwner(ownerAddress: string): Promise<{ services: Service[] }> {
    return this.request<{ services: Service[] }>(`/api/services/owner/${ownerAddress}`);
  }

  // Payments API
  async verifyPayment(paymentId: string): Promise<PaymentInfo> {
    return this.request<PaymentInfo>(`/api/payments/verify/${paymentId}`);
  }

  async getPaymentProof(paymentId: string): Promise<any> {
    return this.request<any>(`/api/payments/proof/${paymentId}`);
  }

  async getSubscription(serviceId: string, subscriber: string): Promise<any> {
    return this.request<any>(`/api/payments/subscription/${serviceId}/${subscriber}`);
  }

  // X402 Protected Resources API
  async checkProtectedResource(
    serviceId: string,
    resourceId: string
  ): Promise<{ status: number; data: any }> {
    const url = `${this.baseUrl}/api/x402/protected/${serviceId}/${resourceId}`;

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
  }

  // Helper method to download payment proof as file
  async downloadPaymentProof(paymentId: string): Promise<void> {
    try {
      const proof = await this.getPaymentProof(paymentId);

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
    } catch (error) {
      console.error('Failed to download payment proof:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const api = new API();
export default api;
