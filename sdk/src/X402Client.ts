import { ethers, BigNumber, BigNumberish } from 'ethers';
import {
  X402Config,
  Service,
  CreateServiceParams,
  UpdateServiceParams,
  PaymentParams,
  PaymentResult,
  PaymentProof,
  Subscription,
  AccessResult,
  TransactionOptions,
  X402Error,
  PaymentError,
  ServiceError,
  AccessError,
} from './types';
import {
  PAYMENT_GATEWAY_ABI,
  SERVICE_REGISTRY_ABI,
  ACCESS_CONTROL_ABI,
  USDRIF_TOKEN_ABI,
} from './abis';
import {
  generateResourceId,
  generateServiceId,
  formatUSDRIF,
  parseUSDRIF,
  normalizeAddress,
  waitForTransaction,
  validateServiceParams,
  parseError,
} from './utils';

export class X402Client {
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private config: X402Config;

  // Contract instances
  private paymentGateway: ethers.Contract;
  private serviceRegistry: ethers.Contract;
  private accessControl: ethers.Contract;
  private usdrifToken: ethers.Contract;

  constructor(config: X402Config) {
    this.config = {
      ...config,
    };

    // Initialize provider
    if (config.provider) {
      this.provider = config.provider;
    } else {
      this.provider = new ethers.providers.JsonRpcProvider(this.config.network.rpcUrl);
    }

    // Initialize signer
    if (config.signer) {
      this.signer = config.signer;
    } else if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    // Initialize contracts
    this.paymentGateway = new ethers.Contract(
      this.config.network.contracts.paymentGateway,
      PAYMENT_GATEWAY_ABI,
      this.signer || this.provider
    );

    this.serviceRegistry = new ethers.Contract(
      this.config.network.contracts.serviceRegistry,
      SERVICE_REGISTRY_ABI,
      this.signer || this.provider
    );

    this.accessControl = new ethers.Contract(
      this.config.network.contracts.accessControl,
      ACCESS_CONTROL_ABI,
      this.signer || this.provider
    );

    this.usdrifToken = new ethers.Contract(
      this.config.network.contracts.usdrifToken,
      USDRIF_TOKEN_ABI,
      this.signer || this.provider
    );
  }

  // ===== SERVICE MANAGEMENT =====

  /**
   * Create a new service
   */
  async createService(params: CreateServiceParams, options?: TransactionOptions): Promise<string> {
    if (!this.signer) {
      throw new ServiceError('Signer required for creating services');
    }

    try {
      validateServiceParams(params);

      const tx = await this.serviceRegistry.createService(
        params.name,
        params.description,
        params.price,
        params.validityDuration,
        params.endpoints,
        options || {}
      );

      const receipt = await waitForTransaction(tx.hash, this.provider);

      // Find ServiceCreated event
      const event = receipt.logs.find(log => {
        try {
          const decoded = this.serviceRegistry.interface.parseLog(log);
          return decoded.name === 'ServiceCreated';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new ServiceError('ServiceCreated event not found');
      }

      const decoded = this.serviceRegistry.interface.parseLog(event);
      return decoded.args[0]; // serviceId

    } catch (error) {
      throw new ServiceError(`Failed to create service: ${parseError(error)}`);
    }
  }

  /**
   * Update an existing service
   */
  async updateService(params: UpdateServiceParams, options?: TransactionOptions): Promise<void> {
    if (!this.signer) {
      throw new ServiceError('Signer required for updating services');
    }

    try {
      const currentService = await this.getService(params.serviceId);

      const tx = await this.serviceRegistry.updateService(
        params.serviceId,
        params.price ?? currentService.price,
        params.active ?? currentService.active,
        options || {}
      );

      await waitForTransaction(tx.hash, this.provider);

    } catch (error) {
      throw new ServiceError(`Failed to update service: ${parseError(error)}`);
    }
  }

  /**
   * Get service information
   */
  async getService(serviceId: string): Promise<Service> {
    try {
      const serviceInfo = await this.serviceRegistry.getServiceInfo(serviceId);
      const endpoints = await this.serviceRegistry.getServiceEndpoints(serviceId);

      return {
        id: serviceId,
        name: serviceInfo.name,
        description: serviceInfo.description,
        owner: serviceInfo.owner,
        price: serviceInfo.price,
        validityDuration: serviceInfo.validityDuration.toNumber(),
        endpoints,
        active: serviceInfo.active,
        totalPayments: serviceInfo.totalPayments.toNumber(),
        totalRevenue: serviceInfo.totalRevenue,
      };

    } catch (error) {
      throw new ServiceError(`Failed to get service: ${parseError(error)}`);
    }
  }

  /**
   * Get all services
   */
  async getAllServices(): Promise<Service[]> {
    try {
      const serviceIds = await this.serviceRegistry.getAllServices();
      const services = await Promise.all(
        serviceIds.map((id: string) => this.getService(id))
      );
      return services;

    } catch (error) {
      throw new ServiceError(`Failed to get services: ${parseError(error)}`);
    }
  }

  /**
   * Get services by owner
   */
  async getServicesByOwner(owner: string): Promise<Service[]> {
    try {
      const normalizedOwner = normalizeAddress(owner);
      const serviceIds = await this.serviceRegistry.getServicesByOwner(normalizedOwner);
      const services = await Promise.all(
        serviceIds.map((id: string) => this.getService(id))
      );
      return services;

    } catch (error) {
      throw new ServiceError(`Failed to get services by owner: ${parseError(error)}`);
    }
  }

  /**
   * Add endpoint to service
   */
  async addEndpoint(serviceId: string, endpoint: string, options?: TransactionOptions): Promise<void> {
    if (!this.signer) {
      throw new ServiceError('Signer required for adding endpoints');
    }

    try {
      const tx = await this.serviceRegistry.addEndpoint(serviceId, endpoint, options || {});
      await waitForTransaction(tx.hash, this.provider);

    } catch (error) {
      throw new ServiceError(`Failed to add endpoint: ${parseError(error)}`);
    }
  }

  // ===== PAYMENT PROCESSING =====

  /**
   * Subscribe to a service (make payment)
   */
  async subscribeToService(params: PaymentParams, options?: TransactionOptions): Promise<PaymentResult> {
    if (!this.signer) {
      throw new PaymentError('Signer required for making payments');
    }

    try {
      const service = await this.getService(params.serviceId);

      // Generate resource ID if not provided
      const resourceId = params.resourceId || generateResourceId(
        service.name,
        await this.signer.getAddress()
      );

      // Check and approve USDRIF if needed
      await this.ensureApproval(service.price);

      // Make subscription
      const tx = await this.serviceRegistry.subscribeToService(
        params.serviceId,
        resourceId,
        options || {}
      );

      const receipt = await waitForTransaction(tx.hash, this.provider);

      // Get payment ID from events
      const paymentEvent = receipt.logs.find(log => {
        try {
          const decoded = this.paymentGateway.interface.parseLog(log);
          return decoded.name === 'PaymentMade';
        } catch {
          return false;
        }
      });

      if (!paymentEvent) {
        throw new PaymentError('PaymentMade event not found');
      }

      const paymentId = this.paymentGateway.interface.parseLog(paymentEvent).args.paymentId;
      const proof = await this.getPaymentProof(paymentId);

      return {
        paymentId,
        transactionHash: tx.hash,
        service,
        proof,
      };

    } catch (error) {
      throw new PaymentError(`Failed to subscribe to service: ${parseError(error)}`);
    }
  }

  /**
   * Make direct payment
   */
  async makePayment(serviceId: string, resourceId?: string, options?: TransactionOptions): Promise<PaymentResult> {
    if (!this.signer) {
      throw new PaymentError('Signer required for making payments');
    }

    try {
      const service = await this.getService(serviceId);

      const finalResourceId = resourceId || generateResourceId(
        service.name,
        await this.signer.getAddress()
      );

      // Check and approve USDRIF if needed
      await this.ensureApproval(service.price);

      // Make payment
      const tx = await this.paymentGateway.makePayment(serviceId, finalResourceId, options || {});
      const receipt = await waitForTransaction(tx.hash, this.provider);

      // Get payment ID from transaction receipt
      const event = receipt.logs.find(log => {
        try {
          const decoded = this.paymentGateway.interface.parseLog(log);
          return decoded.name === 'PaymentMade';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new PaymentError('PaymentMade event not found');
      }

      const paymentId = this.paymentGateway.interface.parseLog(event).args.paymentId;
      const proof = await this.getPaymentProof(paymentId);

      return {
        paymentId,
        transactionHash: tx.hash,
        service,
        proof,
      };

    } catch (error) {
      throw new PaymentError(`Failed to make payment: ${parseError(error)}`);
    }
  }

  /**
   * Verify a payment
   */
  async verifyPayment(paymentId: string, resourceId: string, validityDuration?: number): Promise<{ valid: boolean; payer: string }> {
    try {
      const duration = validityDuration ?? 3600; // Default 1 hour
      const result = await this.paymentGateway.verifyPayment(paymentId, resourceId, duration);

      return {
        valid: result.valid,
        payer: result.payer,
      };

    } catch (error) {
      throw new PaymentError(`Failed to verify payment: ${parseError(error)}`);
    }
  }

  /**
   * Get payment proof
   */
  async getPaymentProof(paymentId: string): Promise<PaymentProof> {
    try {
      const info = await this.paymentGateway.getPaymentInfo(paymentId);

      return {
        id: paymentId,
        payer: info.payer,
        recipient: info.recipient,
        amount: info.amount,
        timestamp: info.timestamp.toNumber(),
        resourceId: info.resourceId,
        verified: info.verified,
      };

    } catch (error) {
      throw new PaymentError(`Failed to get payment proof: ${parseError(error)}`);
    }
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(subscriber: string, serviceId: string): Promise<boolean> {
    try {
      const normalizedSubscriber = normalizeAddress(subscriber);
      return await this.serviceRegistry.hasActiveSubscription(normalizedSubscriber, serviceId);

    } catch (error) {
      throw new PaymentError(`Failed to check subscription: ${parseError(error)}`);
    }
  }

  /**
   * Get subscription info
   */
  async getSubscription(serviceId: string, subscriber: string): Promise<Subscription> {
    try {
      const normalizedSubscriber = normalizeAddress(subscriber);
      const info = await this.serviceRegistry.getSubscriptionInfo(serviceId, normalizedSubscriber);

      return {
        subscriber: info.sub,
        serviceId,
        expiresAt: info.expiresAt.toNumber(),
        active: info.active,
      };

    } catch (error) {
      throw new PaymentError(`Failed to get subscription: ${parseError(error)}`);
    }
  }

  // ===== ACCESS CONTROL =====

  /**
   * Request access to a resource
   */
  async requestAccess(resourceId: string, paymentId?: string, options?: TransactionOptions): Promise<string> {
    if (!this.signer) {
      throw new AccessError('Signer required for requesting access');
    }

    try {
      const finalPaymentId = paymentId || ethers.constants.HashZero;

      const tx = await this.accessControl.requestAccess(resourceId, finalPaymentId, options || {});
      const receipt = await waitForTransaction(tx.hash, this.provider);

      // Get request ID from events
      const event = receipt.logs.find(log => {
        try {
          const decoded = this.accessControl.interface.parseLog(log);
          return decoded.name === 'AccessRequested';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new AccessError('AccessRequested event not found');
      }

      return this.accessControl.interface.parseLog(event).args.requestId;

    } catch (error) {
      throw new AccessError(`Failed to request access: ${parseError(error)}`);
    }
  }

  /**
   * Grant access with payment proof
   */
  async grantAccess(requestId: string, paymentId: string, options?: TransactionOptions): Promise<void> {
    if (!this.signer) {
      throw new AccessError('Signer required for granting access');
    }

    try {
      const tx = await this.accessControl.grantAccessWithPayment(requestId, paymentId, options || {});
      await waitForTransaction(tx.hash, this.provider);

    } catch (error) {
      throw new AccessError(`Failed to grant access: ${parseError(error)}`);
    }
  }

  /**
   * Check access to a resource
   */
  async checkAccess(user: string, resourceId: string, validityPeriod?: number): Promise<AccessResult> {
    try {
      // Validate and normalize the user address
      const normalizedUser = normalizeAddress(user);
      const period = validityPeriod ?? 3600; // Default 1 hour
      const hasAccess = await this.accessControl.checkAccess(normalizedUser, resourceId, period);

      if (hasAccess) {
        const lastAccessTime = await this.accessControl.lastAccess(resourceId, normalizedUser);
        return {
          hasAccess: true,
          lastAccessTime: lastAccessTime.toNumber(),
          expiresAt: lastAccessTime.toNumber() + period,
        };
      }

      return { hasAccess: false };

    } catch (error) {
      throw new AccessError(`Failed to check access: ${parseError(error)}`);
    }
  }

  /**
   * Check if user has valid access (default 1 hour)
   */
  async hasValidAccess(user: string, resourceId: string): Promise<boolean> {
    try {
      // Validate and normalize the user address
      const normalizedUser = normalizeAddress(user);
      return await this.accessControl.hasValidAccess(normalizedUser, resourceId);

    } catch (error) {
      throw new AccessError(`Failed to check valid access: ${parseError(error)}`);
    }
  }

  // ===== UTILITY FUNCTIONS =====

  /**
   * Get USDRIF token balance
   */
  async getBalance(address?: string): Promise<BigNumber> {
    try {
      const account = address || (this.signer ? await this.signer.getAddress() : '');
      if (!account) {
        throw new Error('No address provided and no signer available');
      }

      const normalizedAccount = normalizeAddress(account);
      return await this.usdrifToken.balanceOf(normalizedAccount);

    } catch (error) {
      throw new X402Error(`Failed to get balance: ${parseError(error)}`);
    }
  }

  /**
   * Approve USDRIF spending
   */
  async approveUSDRIF(amount: BigNumberish, options?: TransactionOptions): Promise<void> {
    if (!this.signer) {
      throw new X402Error('Signer required for approvals');
    }

    try {
      const tx = await this.usdrifToken.approve(
        this.config.network.contracts.paymentGateway,
        amount,
        options || {}
      );

      await waitForTransaction(tx.hash, this.provider);

    } catch (error) {
      throw new X402Error(`Failed to approve USDRIF: ${parseError(error)}`);
    }
  }

  /**
   * Get USDRIF allowance
   */
  async getAllowance(owner?: string, spender?: string): Promise<BigNumber> {
    try {
      const ownerAddress = owner || (this.signer ? await this.signer.getAddress() : '');
      const spenderAddress = spender || this.config.network.contracts.paymentGateway;

      if (!ownerAddress) {
        throw new Error('No owner address provided and no signer available');
      }

      const normalizedOwner = normalizeAddress(ownerAddress);
      const normalizedSpender = normalizeAddress(spenderAddress);

      return await this.usdrifToken.allowance(normalizedOwner, normalizedSpender);

    } catch (error) {
      throw new X402Error(`Failed to get allowance: ${parseError(error)}`);
    }
  }

  /**
   * Ensure sufficient USDRIF approval
   */
  private async ensureApproval(amount: BigNumberish): Promise<void> {
    const allowance = await this.getAllowance();
    const requiredAmount = BigNumber.from(amount);

    if (allowance.lt(requiredAmount)) {
      await this.approveUSDRIF(requiredAmount.mul(2)); // Approve 2x for buffer
    }
  }

  /**
   * Generate resource ID
   */
  generateResourceId(resource: string, requester?: string): string {
    const address = requester || (this.signer ? '' : '');
    if (!address && !requester) {
      throw new X402Error('Requester address required');
    }
    return generateResourceId(resource, address);
  }

  /**
   * Generate service ID
   */
  generateServiceId(serviceName: string): string {
    return generateServiceId(serviceName);
  }

  /**
   * Format USDRIF amount for display
   */
  formatUSDRIF(amount: BigNumberish): string {
    return formatUSDRIF(amount);
  }

  /**
   * Parse USDRIF amount from string
   */
  parseUSDRIF(amount: string): BigNumber {
    return parseUSDRIF(amount);
  }

  /**
   * Get network configuration
   */
  getNetworkConfig() {
    return this.config.network;
  }

  /**
   * Get current signer address
   */
  async getSignerAddress(): Promise<string> {
    if (!this.signer) {
      throw new X402Error('No signer available');
    }
    return await this.signer.getAddress();
  }
}
