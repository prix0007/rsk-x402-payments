const request = require('supertest');
const express = require('express');

jest.mock('../src/x402Client', () => ({
  getAllServices: jest.fn(),
  getService: jest.fn(),
  createService: jest.fn(),
  updateService: jest.fn(),
  getServicesByOwner: jest.fn()
}));

jest.mock('ethers', () => ({
  ethers: {
    utils: {
      formatEther: jest.fn().mockReturnValue('1.0'),
      parseEther: jest.fn().mockReturnValue('1000000000000000000')
    }
  }
}));

const servicesRouter = require('../src/routes/services');
const mockX402Client = require('../src/x402Client');

describe('Services Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // No auth middleware needed - removed per requirements
    app.use('/api/services', servicesRouter);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/services', () => {
    test('should return all services successfully', async () => {
      const mockServices = [
        {
          id: '0x123',
          name: 'Test Service 1',
          description: 'Description 1',
          owner: '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C',
          price: '1000000000000000000',
          validityDuration: 3600,
          endpoints: ['/api/test1'],
          active: true,
          totalPayments: 10,
          totalRevenue: '10000000000000000000'
        },
        {
          id: '0x456',
          name: 'Test Service 2',
          description: 'Description 2',
          owner: '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C',
          price: '2000000000000000000',
          validityDuration: 7200,
          endpoints: ['/api/test2'],
          active: true,
          totalPayments: 5,
          totalRevenue: '10000000000000000000'
        }
      ];

      mockX402Client.getAllServices.mockResolvedValue(mockServices);

      const response = await request(app)
        .get('/api/services')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Test Service 1');
      expect(response.body.data[0].price).toBe('1.0'); // formatted by ethers.utils.formatEther
      expect(mockX402Client.getAllServices).toHaveBeenCalledTimes(1);
    });

    test('should handle errors when fetching services', async () => {
      mockX402Client.getAllServices.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/api/services')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch services');
      expect(response.body.message).toBe('Network error');
    });
  });

  describe('GET /api/services/:serviceId', () => {
    test('should return service by ID successfully', async () => {
      const mockService = {
        id: '0x123',
        name: 'Test Service',
        description: 'Test Description',
        owner: '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C',
        price: '1000000000000000000',
        validityDuration: 3600,
        endpoints: ['/api/test'],
        active: true,
        totalPayments: 10,
        totalRevenue: '10000000000000000000'
      };

      mockX402Client.getService.mockResolvedValue(mockService);

      const response = await request(app)
        .get('/api/services/0x123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Service');
      expect(response.body.data.price).toBe('1.0');
      expect(mockX402Client.getService).toHaveBeenCalledWith('0x123');
    });

    test('should return 404 when service not found', async () => {
      mockX402Client.getService.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/services/0x999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Service not found');
    });

    test('should handle errors when fetching service by ID', async () => {
      mockX402Client.getService.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/services/0x123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch service');
    });
  });

  describe('POST /api/services', () => {
    test('should create service successfully', async () => {
      const serviceData = {
        name: 'New Service',
        description: 'New Service Description',
        price: '0.1',
        validityDuration: 3600,
        endpoints: ['/api/new']
      };

      mockX402Client.createService.mockResolvedValue('0xtransactionhash');

      const response = await request(app)
        .post('/api/services')
        .send(serviceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactionHash).toBe('0xtransactionhash');
      expect(response.body.data.message).toBe('Service creation transaction submitted');

      expect(mockX402Client.createService).toHaveBeenCalledWith({
        name: 'New Service',
        description: 'New Service Description',
        price: '1000000000000000000', // parsed by ethers.utils.parseEther
        validityDuration: 3600,
        endpoints: ['/api/new']
      });
    });

    test('should validate required fields', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        description: 'Description',
        price: '0.1',
        validityDuration: 3600,
        endpoints: ['/api/test']
      };

      const response = await request(app)
        .post('/api/services')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(mockX402Client.createService).not.toHaveBeenCalled();
    });

    test('should handle service creation errors', async () => {
      const serviceData = {
        name: 'New Service',
        description: 'New Service Description',
        price: '0.1',
        validityDuration: 3600,
        endpoints: ['/api/new']
      };

      mockX402Client.createService.mockRejectedValue(new Error('Blockchain error'));

      const response = await request(app)
        .post('/api/services')
        .send(serviceData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create service');
    });
  });

  describe('PUT /api/services/:serviceId', () => {
    test('should update service successfully', async () => {
      const updateData = {
        name: 'Updated Service Name',
        price: '0.2'
      };

      mockX402Client.updateService.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/services/0x123')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service updated successfully');

      expect(mockX402Client.updateService).toHaveBeenCalledWith({
        serviceId: '0x123',
        name: 'Updated Service Name',
        price: '1000000000000000000' // parsed price
      });
    });

    test('should update service without price conversion when price not provided', async () => {
      const updateData = {
        name: 'Updated Service Name'
      };

      mockX402Client.updateService.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/services/0x123')
        .send(updateData)
        .expect(200);

      expect(mockX402Client.updateService).toHaveBeenCalledWith({
        serviceId: '0x123',
        name: 'Updated Service Name'
      });
    });

    test('should handle service update errors', async () => {
      const updateData = { name: 'Updated Name' };

      mockX402Client.updateService.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .put('/api/services/0x123')
        .send(updateData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to update service');
    });
  });

  describe('GET /api/services/owner/:ownerAddress', () => {
    test('should return services by owner successfully', async () => {
      const ownerAddress = '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C';
      const mockServices = [
        {
          id: '0x123',
          name: 'Owner Service 1',
          description: 'Description 1',
          owner: ownerAddress,
          price: '1000000000000000000',
          validityDuration: 3600,
          endpoints: ['/api/test1'],
          active: true,
          totalPayments: 5,
          totalRevenue: '5000000000000000000'
        }
      ];

      mockX402Client.getServicesByOwner.mockResolvedValue(mockServices);

      const response = await request(app)
        .get(`/api/services/owner/${ownerAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Owner Service 1');
      expect(response.body.data[0].owner).toBe(ownerAddress);
      expect(mockX402Client.getServicesByOwner).toHaveBeenCalledWith(ownerAddress);
    });

    test('should handle errors when fetching services by owner', async () => {
      const ownerAddress = '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C';

      mockX402Client.getServicesByOwner.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get(`/api/services/owner/${ownerAddress}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch services by owner');
    });
  });
});