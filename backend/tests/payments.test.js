const request = require('supertest');
const express = require('express');

jest.mock('../src/x402Client', () => ({
  makePayment: jest.fn(),
  verifyPayment: jest.fn(),
  getPaymentProof: jest.fn(),
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

const paymentsRouter = require('../src/routes/payments');
const mockX402Client = require('../src/x402Client');

describe('Payments Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // No auth middleware needed - removed per requirements
    app.use('/api/payments', paymentsRouter);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('POST /api/payments', () => {
    test('should make payment successfully', async () => {
      const paymentData = {
        serviceId: '0x1234567890123456789012345678901234567890123456789012345678901234',
        resourceId: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      };

      const mockPaymentResult = {
        paymentId: '0xpayment123',
        transactionHash: '0xtxhash123',
        amount: '1000000000000000000'
      };

      mockX402Client.makePayment.mockResolvedValue(mockPaymentResult);

      const response = await request(app)
        .post('/api/payments')
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentId).toBe('0xpayment123');
      expect(response.body.data.transactionHash).toBe('0xtxhash123');
      expect(response.body.data.amount).toBe('1.0'); // formatted by ethers.utils.formatEther
      expect(response.body.data.message).toBe('Payment successful');

      expect(mockX402Client.makePayment).toHaveBeenCalledWith(
        paymentData.serviceId,
        paymentData.resourceId
      );
    });

    test('should validate payment data', async () => {
      const invalidPaymentData = {
        serviceId: 'invalid-service-id'
      };

      const response = await request(app)
        .post('/api/payments')
        .send(invalidPaymentData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(mockX402Client.makePayment).not.toHaveBeenCalled();
    });

    test('should handle payment errors', async () => {
      const paymentData = {
        serviceId: '0x1234567890123456789012345678901234567890123456789012345678901234'
      };

      mockX402Client.makePayment.mockRejectedValue(new Error('Insufficient balance'));

      const response = await request(app)
        .post('/api/payments')
        .send(paymentData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment failed');
      expect(response.body.message).toBe('Insufficient balance');
    });
  });

  describe('GET /api/payments/verify/:paymentId', () => {
    test('should verify payment successfully', async () => {
      const paymentId = '0xpayment123';
      const resourceId = '0xresource123';

      const mockVerification = {
        valid: true,
        payer: '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C'
      };

      mockX402Client.verifyPayment.mockResolvedValue(mockVerification);

      const response = await request(app)
        .get(`/api/payments/verify/${paymentId}?resourceId=${resourceId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.payer).toBe('0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C');

      expect(mockX402Client.verifyPayment).toHaveBeenCalledWith(paymentId, resourceId);
    });

    test('should require resourceId query parameter', async () => {
      const paymentId = '0xpayment123';

      const response = await request(app)
        .get(`/api/payments/verify/${paymentId}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('resourceId query parameter is required');
      expect(mockX402Client.verifyPayment).not.toHaveBeenCalled();
    });

    test('should handle verification errors', async () => {
      const paymentId = '0xpayment123';
      const resourceId = '0xresource123';

      mockX402Client.verifyPayment.mockRejectedValue(new Error('Payment not found'));

      const response = await request(app)
        .get(`/api/payments/verify/${paymentId}?resourceId=${resourceId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment verification failed');
    });
  });

  describe('GET /api/payments/proof/:paymentId', () => {
    test('should get payment proof successfully', async () => {
      const paymentId = '0xpayment123';

      const mockProof = {
        paymentId: '0xpayment123',
        serviceId: '0xservice123',
        payer: '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C',
        amount: '1000000000000000000',
        timestamp: '1640995200'
      };

      mockX402Client.getPaymentProof.mockResolvedValue(mockProof);

      const response = await request(app)
        .get(`/api/payments/proof/${paymentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProof);

      expect(mockX402Client.getPaymentProof).toHaveBeenCalledWith(paymentId);
    });

    test('should handle proof retrieval errors', async () => {
      const paymentId = '0xpayment123';

      mockX402Client.getPaymentProof.mockRejectedValue(new Error('Proof not found'));

      const response = await request(app)
        .get(`/api/payments/proof/${paymentId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get payment proof');
    });
  });

  describe('GET /api/payments/subscription/:serviceId/:subscriber', () => {
    test('should check subscription status successfully', async () => {
      const serviceId = '0xservice123';
      const subscriber = '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C';

      mockX402Client.hasActiveSubscription.mockResolvedValue(true);

      const response = await request(app)
        .get(`/api/payments/subscription/${serviceId}/${subscriber}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasActiveSubscription).toBe(true);
      expect(response.body.data.subscriber).toBe(subscriber);
      expect(response.body.data.serviceId).toBe(serviceId);

      expect(mockX402Client.hasActiveSubscription).toHaveBeenCalledWith(subscriber, serviceId);
    });

    test('should handle subscription check errors', async () => {
      const serviceId = '0xservice123';
      const subscriber = '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C';

      mockX402Client.hasActiveSubscription.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get(`/api/payments/subscription/${serviceId}/${subscriber}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to check subscription');
    });
  });

  describe('POST /api/payments/subscribe', () => {
    test('should subscribe to service successfully', async () => {
      const subscriptionData = {
        serviceId: '0xservice123',
        amount: 1.5
      };

      const mockResult = {
        paymentId: '0xpayment123',
        transactionHash: '0xtxhash123'
      };

      mockX402Client.subscribeToService.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/payments/subscribe')
        .send(subscriptionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentId).toBe('0xpayment123');
      expect(response.body.data.transactionHash).toBe('0xtxhash123');
      expect(response.body.data.subscriptionActive).toBe(true);
      expect(response.body.data.message).toBe('Subscription successful');

      expect(mockX402Client.subscribeToService).toHaveBeenCalledWith({
        serviceId: '0xservice123',
        amount: '1000000000000000000' // parsed by ethers.utils.parseEther
      });
    });

    test('should handle subscription errors', async () => {
      const subscriptionData = {
        serviceId: '0xservice123',
        amount: 1.0
      };

      mockX402Client.subscribeToService.mockRejectedValue(new Error('Subscription failed'));

      const response = await request(app)
        .post('/api/payments/subscribe')
        .send(subscriptionData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Subscription failed');
    });

    test('should handle missing amount', async () => {
      const subscriptionData = {
        serviceId: '0xservice123'
        // missing amount
      };

      const response = await request(app)
        .post('/api/payments/subscribe')
        .send(subscriptionData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockX402Client.subscribeToService).not.toHaveBeenCalled();
    });
  });
});