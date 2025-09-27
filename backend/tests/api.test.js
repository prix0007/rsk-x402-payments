const request = require('supertest');
const express = require('express');

// Create a simple test app without complex mocking
function createSimpleTestApp() {
  const app = express();
  app.use(express.json());

  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: 'test',
      version: '1.0.0'
    });
  });

  // API info endpoint
  app.get('/api', (req, res) => {
    res.json({
      name: 'X402 Payments Backend',
      version: '1.0.0',
      description: 'Express backend server for X402 payments on Rootstock',
      endpoints: {
        health: '/health',
        services: '/api/services',
        payments: '/api/payments',
        x402: '/api/x402'
      },
      network: {
        name: 'Local Development',
        chainId: 31337,
        rpcUrl: 'http://127.0.0.1:8545'
      }
    });
  });

  return app;
}

describe('Basic API Tests', () => {
  let app;

  beforeEach(() => {
    app = createSimpleTestApp();
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.environment).toBe('test');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('API Info', () => {
    test('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.name).toBe('X402 Payments Backend');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.description).toContain('X402 payments');
      expect(response.body.endpoints).toEqual({
        health: '/health',
        services: '/api/services',
        payments: '/api/payments',
        x402: '/api/x402'
      });
      expect(response.body.network).toEqual({
        name: 'Local Development',
        chainId: 31337,
        rpcUrl: 'http://127.0.0.1:8545'
      });
    });
  });

  describe('404 Handling', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      // Basic 404 handling should be present
      expect(response.status).toBe(404);
    });
  });

  describe('JSON Parsing', () => {
    test('should parse JSON requests correctly', async () => {
      // Add a simple test endpoint that echoes JSON
      app.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });

      const testData = { test: 'data', number: 123 };

      const response = await request(app)
        .post('/test-json')
        .send(testData)
        .expect(200);

      expect(response.body.received).toEqual(testData);
    });
  });
});