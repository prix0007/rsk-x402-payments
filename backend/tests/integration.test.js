const request = require('supertest');
const express = require('express');

// Create a test app similar to the main app
function createTestApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // No auth middleware needed - removed per requirements

  // Routes
  app.use('/api/services', require('../src/routes/services'));
  app.use('/api/payments', require('../src/routes/payments'));
  app.use('/api/x402', require('../src/routes/x402'));

  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  return app;
}

jest.mock('../src/x402Client', () => ({
  createService: jest.fn(),
  getService: jest.fn(),
  makePayment: jest.fn(),
  checkAccess: jest.fn(),
  verifyPayment: jest.fn(),
  hasActiveSubscription: jest.fn(),
  subscribeToService: jest.fn()
}));

jest.mock('ethers', () => ({
  ethers: {
    utils: {
      formatEther: jest.fn().mockReturnValue('1.0'),
      parseEther: jest.fn().mockReturnValue('1000000000000000000')
    }
  }
}));

const mockX402Client = require('../src/x402Client');

describe('X402 Payment Flow Integration Tests', () => {
  let app;
  const serviceId = '0x1234567890123456789012345678901234567890123456789012345678901234';
  const resourceId = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef';
  const userAddress = '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C';
  const paymentId = '0xpayment123456789abcdef';

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('Complete X402 Payment Flow', () => {
    test('should complete full payment flow: service creation -> access attempt -> payment -> access granted', async () => {
      // Step 1: Create a service
      const serviceData = {
        name: 'Premium Data API',
        description: 'High-quality financial data',
        price: '0.1',
        validityDuration: 3600,
        endpoints: ['/api/financial-data']
      };

      mockX402Client.createService.mockResolvedValue('0xtransactionhash123');

      const createServiceResponse = await request(app)
        .post('/api/services')
        .send(serviceData)
        .expect(201);

      expect(createServiceResponse.body.success).toBe(true);
      expect(createServiceResponse.body.data.transactionHash).toBe('0xtransactionhash123');

      // Step 2: Attempt to access protected resource (should return 402 Payment Required)
      const mockService = {
        name: 'Premium Data API',
        description: 'High-quality financial data',
        price: '100000000000000000', // 0.1 ETH in wei
        validityDuration: 3600
      };

      mockX402Client.checkAccess.mockResolvedValue({ hasAccess: false });
      mockX402Client.getService.mockResolvedValue(mockService);

      const accessAttemptResponse = await request(app)
        .get(`/api/x402/protected/${serviceId}/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(402);

      expect(accessAttemptResponse.body.error).toBe('Payment Required');
      expect(accessAttemptResponse.body.code).toBe(402);
      expect(accessAttemptResponse.body.payment).toEqual({
        serviceId,
        resourceId,
        serviceName: 'Premium Data API',
        price: '1.0',
        currency: 'USDRIF',
        network: 'rootstock',
        validityDuration: 3600,
        paymentEndpoint: 'http://localhost:3000/api/payments',
        verifyEndpoint: 'http://localhost:3000/api/payments/verify',
        description: 'High-quality financial data'
      });

      // Step 3: Make payment
      const paymentData = {
        serviceId: '0x1234567890123456789012345678901234567890123456789012345678901234',
        resourceId: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };

      const mockPaymentResult = {
        paymentId,
        transactionHash: '0xpaymenttxhash',
        amount: '100000000000000000'
      };

      mockX402Client.makePayment.mockResolvedValue(mockPaymentResult);

      const paymentResponse = await request(app)
        .post('/api/payments')
        .send(paymentData)
        .expect(201);

      expect(paymentResponse.body.success).toBe(true);
      expect(paymentResponse.body.data.paymentId).toBe(paymentId);
      expect(paymentResponse.body.data.amount).toBe('1.0');

      // Step 4: Verify payment
      const mockVerification = {
        valid: true,
        payer: userAddress
      };

      mockX402Client.verifyPayment.mockResolvedValue(mockVerification);

      const verifyResponse = await request(app)
        .get(`/api/payments/verify/${paymentId}?resourceId=${resourceId}`)
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.valid).toBe(true);
      expect(verifyResponse.body.data.payer).toBe(userAddress);

      // Step 5: Access protected resource again (should now be granted)
      const expiresAt = new Date(Date.now() + 3600000).toISOString();
      mockX402Client.checkAccess.mockResolvedValue({
        hasAccess: true,
        expiresAt
      });

      const accessGrantedResponse = await request(app)
        .get(`/api/x402/protected/${serviceId}/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(200);

      expect(accessGrantedResponse.body.success).toBe(true);
      expect(accessGrantedResponse.body.data.message).toBe('Access granted to protected resource');
      expect(accessGrantedResponse.body.data.userAddress).toBe(userAddress);
      expect(accessGrantedResponse.body.data.content).toEqual({
        title: 'Protected Resource',
        data: 'This is premium content that requires payment to access.',
        timestamp: expect.any(String)
      });

      // Verify all expected calls were made
      expect(mockX402Client.createService).toHaveBeenCalledWith({
        name: 'Premium Data API',
        description: 'High-quality financial data',
        price: '1000000000000000000',
        validityDuration: 3600,
        endpoints: ['/api/financial-data']
      });

      expect(mockX402Client.checkAccess).toHaveBeenCalledTimes(2);
      expect(mockX402Client.getService).toHaveBeenCalledWith(serviceId);
      expect(mockX402Client.makePayment).toHaveBeenCalledWith(serviceId, resourceId);
      expect(mockX402Client.verifyPayment).toHaveBeenCalledWith(paymentId, resourceId);
    });

    test('should handle access check for different validity periods', async () => {
      const customValidityPeriod = 7200; // 2 hours

      mockX402Client.checkAccess.mockResolvedValue({
        hasAccess: true,
        expiresAt: new Date(Date.now() + customValidityPeriod * 1000).toISOString()
      });

      const response = await request(app)
        .get(`/api/x402/access/${resourceId}?validityPeriod=${customValidityPeriod}`)
        .set('x-user-address', userAddress)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasAccess).toBe(true);
      expect(mockX402Client.checkAccess).toHaveBeenCalledWith(
        userAddress,
        resourceId,
        customValidityPeriod
      );
    });

    test('should handle subscription workflow', async () => {
      const subscriptionData = {
        serviceId,
        amount: 5.0
      };

      const mockSubscriptionResult = {
        paymentId: '0xsubscription123',
        transactionHash: '0xsubscriptiontx'
      };

      mockX402Client.subscribeToService = jest.fn().mockResolvedValue(mockSubscriptionResult);

      const subscribeResponse = await request(app)
        .post('/api/payments/subscribe')
        .send(subscriptionData)
        .expect(201);

      expect(subscribeResponse.body.success).toBe(true);
      expect(subscribeResponse.body.data.subscriptionActive).toBe(true);

      // Check subscription status
      mockX402Client.hasActiveSubscription = jest.fn().mockResolvedValue(true);

      const statusResponse = await request(app)
        .get(`/api/payments/subscription/${serviceId}/${userAddress}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.hasActiveSubscription).toBe(true);
    });

    test('should handle payment failure scenarios', async () => {
      // Test insufficient balance scenario
      const paymentData = {
        serviceId,
        resourceId
      };

      mockX402Client.makePayment.mockRejectedValue(new Error('Insufficient balance'));

      const paymentResponse = await request(app)
        .post('/api/payments')
        .send(paymentData)
        .expect(500);

      expect(paymentResponse.body.success).toBe(false);
      expect(paymentResponse.body.error).toBe('Payment failed');
      expect(paymentResponse.body.message).toBe('Insufficient balance');

      // Verify access is still denied
      mockX402Client.checkAccess.mockResolvedValue({ hasAccess: false });

      const accessResponse = await request(app)
        .get(`/api/x402/access/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(200);

      expect(accessResponse.body.data.hasAccess).toBe(false);
    });

    test('should handle service not found scenarios', async () => {
      // Try to access a non-existent service
      mockX402Client.checkAccess.mockResolvedValue({ hasAccess: false });
      mockX402Client.getService.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/x402/protected/0xinvalid/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(404);

      expect(response.body.error).toBe('Service not found');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing headers appropriately', async () => {
      const response = await request(app)
        .get(`/api/x402/protected/${serviceId}/${resourceId}`)
        // Missing x-user-address header
        .expect(400);

      expect(response.body.error).toBe('Missing x-user-address header');
    });

    test('should handle invalid validation data', async () => {
      const invalidServiceData = {
        name: '', // Invalid: empty name
        description: 'Description',
        price: 'invalid-price', // Invalid: not a number
        validityDuration: 0, // Invalid: zero duration
        endpoints: [] // Invalid: empty array
      };

      const response = await request(app)
        .post('/api/services')
        .send(invalidServiceData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
    });

    test('should handle network errors gracefully', async () => {
      mockX402Client.getService.mockRejectedValue(new Error('Network timeout'));

      const response = await request(app)
        .get(`/api/services/${serviceId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch service');
    });
  });
});