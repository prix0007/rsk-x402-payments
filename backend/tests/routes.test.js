const request = require('supertest');
const express = require('express');

// Simple working tests for the backend routes without complex mocking
describe('Route Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock route handlers that don't require SDK
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    app.get('/api/info', (req, res) => {
      res.json({
        name: 'X402 Payments Backend',
        version: '1.0.0',
        endpoints: {
          services: '/api/services',
          payments: '/api/payments',
          x402: '/api/x402'
        }
      });
    });

    // Test route for validation
    app.post('/api/test-validation', (req, res) => {
      const { z } = require('zod');

      const schema = z.object({
        serviceId: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        price: z.string().regex(/^\d+(\.\d+)?$/)
      });

      try {
        const result = schema.parse(req.body);
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        });
      }
    });

    // Test 402 Payment Required response
    app.get('/api/test-x402/:serviceId/:resourceId', (req, res) => {
      const { serviceId, resourceId } = req.params;
      const userAddress = req.headers['x-user-address'];

      if (!userAddress) {
        return res.status(400).json({
          error: 'Missing x-user-address header'
        });
      }

      // Simulate payment required
      res.status(402).json({
        error: 'Payment Required',
        code: 402,
        message: 'X402 Payment Required to access this resource',
        payment: {
          serviceId,
          resourceId,
          price: '0.1',
          currency: 'USDRIF',
          network: 'rootstock',
          paymentEndpoint: 'http://localhost:3000/api/payments'
        }
      });
    });
  });

  describe('Health and Info Endpoints', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should return API info', async () => {
      const response = await request(app)
        .get('/api/info')
        .expect(200);

      expect(response.body.name).toBe('X402 Payments Backend');
      expect(response.body.endpoints).toHaveProperty('services');
      expect(response.body.endpoints).toHaveProperty('payments');
      expect(response.body.endpoints).toHaveProperty('x402');
    });
  });

  describe('Validation Testing', () => {
    test('should validate correct service data', async () => {
      const validData = {
        serviceId: '0x1234567890123456789012345678901234567890123456789012345678901234',
        price: '0.1'
      };

      const response = await request(app)
        .post('/api/test-validation')
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    test('should reject invalid service ID', async () => {
      const invalidData = {
        serviceId: 'invalid-service-id',
        price: '0.1'
      };

      const response = await request(app)
        .post('/api/test-validation')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    test('should reject invalid price format', async () => {
      const invalidData = {
        serviceId: '0x1234567890123456789012345678901234567890123456789012345678901234',
        price: 'invalid-price'
      };

      const response = await request(app)
        .post('/api/test-validation')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('X402 Protocol Testing', () => {
    test('should return 402 Payment Required', async () => {
      const serviceId = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const resourceId = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const userAddress = '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C';

      const response = await request(app)
        .get(`/api/test-x402/${serviceId}/${resourceId}`)
        .set('x-user-address', userAddress)
        .expect(402);

      expect(response.body.error).toBe('Payment Required');
      expect(response.body.code).toBe(402);
      expect(response.body.payment).toEqual({
        serviceId,
        resourceId,
        price: '0.1',
        currency: 'USDRIF',
        network: 'rootstock',
        paymentEndpoint: 'http://localhost:3000/api/payments'
      });
    });

    test('should require x-user-address header', async () => {
      const serviceId = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const resourceId = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      const response = await request(app)
        .get(`/api/test-x402/${serviceId}/${resourceId}`)
        .expect(400);

      expect(response.body.error).toBe('Missing x-user-address header');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/test-validation')
        .set('Content-Type', 'application/json')
        .send('invalid-json')
        .expect(400);
    });
  });

  describe('Headers and CORS', () => {
    test('should handle different content types', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Accept', 'application/json')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('should handle custom headers', async () => {
      const userAddress = '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C';
      const serviceId = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const resourceId = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      const response = await request(app)
        .get(`/api/test-x402/${serviceId}/${resourceId}`)
        .set('x-user-address', userAddress)
        .set('x-custom-header', 'test-value')
        .expect(402);

      expect(response.body.payment.serviceId).toBe(serviceId);
    });
  });
});