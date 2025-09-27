const request = require('supertest');
const express = require('express');
const x402Router = require('../src/routes/x402');

jest.mock('../src/x402Client', () => ({
  checkAccess: jest.fn(),
  getService: jest.fn(),
  requestAccess: jest.fn(),
  grantAccess: jest.fn()
}));

const mockX402Client = require('../src/x402Client');

// Mock config
jest.mock('../src/config', () => ({
  apiBaseUrl: 'http://localhost:3000'
}));

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    utils: {
      formatEther: jest.fn().mockReturnValue('1.0')
    }
  }
}));

describe('X402 Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // No auth middleware needed - removed per requirements
    app.use('/api/x402', x402Router);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/x402/protected/:serviceId/:resourceId', () => {
    const serviceId = '0xservice123';
    const resourceId = '0xresource123';
    const userAddress = '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C';

    test('should return 400 when x-user-address header is missing', async () => {
      const response = await request(app)
        .get(`/api/x402/protected/${serviceId}/${resourceId}`)
        .expect(400);

      expect(response.body.error).toBe('Missing x-user-address header');
    });

    test('should return 402 Payment Required when user has no access', async () => {
      const mockService = {
        name: 'Test Service',
        description: 'Test Description',
        price: '1000000000000000000',
        validityDuration: 3600
      };

      mockX402Client.checkAccess.mockResolvedValue({ hasAccess: false });
      mockX402Client.getService.mockResolvedValue(mockService);

      const response = await request(app)
        .get(`/api/x402/protected/${serviceId}/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(402);

      expect(response.body.error).toBe('Payment Required');
      expect(response.body.code).toBe(402);
      expect(response.body.message).toBe('X402 Payment Required to access this resource');
      expect(response.body.payment).toEqual({
        serviceId,
        resourceId,
        serviceName: 'Test Service',
        price: '1.0', // formatted by ethers.utils.formatEther
        currency: 'USDRIF',
        network: 'rootstock',
        validityDuration: 3600,
        paymentEndpoint: 'http://localhost:3000/api/payments',
        verifyEndpoint: 'http://localhost:3000/api/payments/verify',
        description: 'Test Description'
      });

      expect(mockX402Client.checkAccess).toHaveBeenCalledWith(userAddress, resourceId);
      expect(mockX402Client.getService).toHaveBeenCalledWith(serviceId);
    });

    test('should return 404 when service is not found', async () => {
      mockX402Client.checkAccess.mockResolvedValue({ hasAccess: false });
      mockX402Client.getService.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/x402/protected/${serviceId}/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(404);

      expect(response.body.error).toBe('Service not found');
    });

    test('should grant access when user has valid access', async () => {
      const expiresAt = new Date(Date.now() + 3600000).toISOString();

      mockX402Client.checkAccess.mockResolvedValue({
        hasAccess: true,
        expiresAt
      });

      const response = await request(app)
        .get(`/api/x402/protected/${serviceId}/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Access granted to protected resource');
      expect(response.body.data.resourceId).toBe(resourceId);
      expect(response.body.data.serviceId).toBe(serviceId);
      expect(response.body.data.userAddress).toBe(userAddress);
      expect(response.body.data.accessExpiresAt).toBe(expiresAt);
      expect(response.body.data.content).toEqual({
        title: 'Protected Resource',
        data: 'This is premium content that requires payment to access.',
        timestamp: expect.any(String)
      });

      expect(mockX402Client.checkAccess).toHaveBeenCalledWith(userAddress, resourceId);
      expect(mockX402Client.getService).not.toHaveBeenCalled();
    });

    test('should handle errors during access check', async () => {
      mockX402Client.checkAccess.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get(`/api/x402/protected/${serviceId}/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to access resource');
      expect(response.body.message).toBe('Network error');
    });
  });

  describe('GET /api/x402/access/:resourceId', () => {
    const resourceId = '0xresource123';
    const userAddress = '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C';

    test('should return access status successfully', async () => {
      const expiresAt = new Date(Date.now() + 3600000).toISOString();

      mockX402Client.checkAccess.mockResolvedValue({
        hasAccess: true,
        expiresAt
      });

      const response = await request(app)
        .get(`/api/x402/access/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasAccess).toBe(true);
      expect(response.body.data.expiresAt).toBe(expiresAt);
      expect(response.body.data.userAddress).toBe(userAddress);
      expect(response.body.data.resourceId).toBe(resourceId);

      expect(mockX402Client.checkAccess).toHaveBeenCalledWith(userAddress, resourceId, undefined);
    });

    test('should pass validity period parameter', async () => {
      const validityPeriod = '7200';

      mockX402Client.checkAccess.mockResolvedValue({
        hasAccess: false,
        expiresAt: null
      });

      const response = await request(app)
        .get(`/api/x402/access/${resourceId}?validityPeriod=${validityPeriod}`)
        .set('x-user-address', userAddress)
        .expect(200);

      expect(mockX402Client.checkAccess).toHaveBeenCalledWith(userAddress, resourceId, 7200);
    });

    test('should return 400 when x-user-address header is missing', async () => {
      const response = await request(app)
        .get(`/api/x402/access/${resourceId}`)
        .expect(400);

      expect(response.body.error).toBe('Missing x-user-address header');
    });

    test('should handle errors during access check', async () => {
      mockX402Client.checkAccess.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/x402/access/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to check access');
    });
  });

  describe('POST /api/x402/access/request', () => {
    test('should create access request successfully', async () => {
      const requestData = {
        resourceId: '0xresource123',
        paymentId: '0xpayment123'
      };

      const mockRequestId = '0xrequest123';
      mockX402Client.requestAccess.mockResolvedValue(mockRequestId);

      const response = await request(app)
        .post('/api/x402/access/request')
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requestId).toBe(mockRequestId);
      expect(response.body.data.resourceId).toBe(requestData.resourceId);
      expect(response.body.data.paymentId).toBe(requestData.paymentId);
      expect(response.body.data.message).toBe('Access request created');

      expect(mockX402Client.requestAccess).toHaveBeenCalledWith(
        requestData.resourceId,
        requestData.paymentId
      );
    });

    test('should return 400 when resourceId is missing', async () => {
      const requestData = {
        paymentId: '0xpayment123'
      };

      const response = await request(app)
        .post('/api/x402/access/request')
        .send(requestData)
        .expect(400);

      expect(response.body.error).toBe('resourceId is required');
      expect(mockX402Client.requestAccess).not.toHaveBeenCalled();
    });

    test('should handle errors during access request', async () => {
      const requestData = {
        resourceId: '0xresource123',
        paymentId: '0xpayment123'
      };

      mockX402Client.requestAccess.mockRejectedValue(new Error('Request failed'));

      const response = await request(app)
        .post('/api/x402/access/request')
        .send(requestData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to request access');
    });
  });

  describe('POST /api/x402/access/grant', () => {
    test('should grant access successfully', async () => {
      const grantData = {
        requestId: '0xrequest123',
        paymentId: '0xpayment123'
      };

      mockX402Client.grantAccess.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/x402/access/grant')
        .send(grantData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requestId).toBe(grantData.requestId);
      expect(response.body.data.paymentId).toBe(grantData.paymentId);
      expect(response.body.data.message).toBe('Access granted successfully');

      expect(mockX402Client.grantAccess).toHaveBeenCalledWith(
        grantData.requestId,
        grantData.paymentId
      );
    });

    test('should return 400 when requestId is missing', async () => {
      const grantData = {
        paymentId: '0xpayment123'
      };

      const response = await request(app)
        .post('/api/x402/access/grant')
        .send(grantData)
        .expect(400);

      expect(response.body.error).toBe('requestId and paymentId are required');
      expect(mockX402Client.grantAccess).not.toHaveBeenCalled();
    });

    test('should return 400 when paymentId is missing', async () => {
      const grantData = {
        requestId: '0xrequest123'
      };

      const response = await request(app)
        .post('/api/x402/access/grant')
        .send(grantData)
        .expect(400);

      expect(response.body.error).toBe('requestId and paymentId are required');
      expect(mockX402Client.grantAccess).not.toHaveBeenCalled();
    });

    test('should handle errors during access grant', async () => {
      const grantData = {
        requestId: '0xrequest123',
        paymentId: '0xpayment123'
      };

      mockX402Client.grantAccess.mockRejectedValue(new Error('Grant failed'));

      const response = await request(app)
        .post('/api/x402/access/grant')
        .send(grantData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to grant access');
    });
  });
});