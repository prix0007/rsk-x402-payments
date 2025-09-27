const {
  serviceIdSchema,
  resourceIdSchema,
  addressSchema,
  paymentIdSchema,
  validateBody,
  validateQuery
} = require('../src/middleware/validation');

describe('Validation Middleware', () => {
  describe('serviceIdSchema', () => {
    test('should validate valid service ID', () => {
      const validServiceId = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const result = serviceIdSchema.parse(validServiceId);
      expect(result).toBe(validServiceId);
    });

    test('should reject invalid service ID format', () => {
      const invalidServiceId = 'invalid-service-id';
      expect(() => serviceIdSchema.parse(invalidServiceId)).toThrow();
    });

    test('should reject short service ID', () => {
      const shortServiceId = '0x123456';
      expect(() => serviceIdSchema.parse(shortServiceId)).toThrow();
    });
  });

  describe('resourceIdSchema', () => {
    test('should validate valid resource ID', () => {
      const validResourceId = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const result = resourceIdSchema.parse(validResourceId);
      expect(result).toBe(validResourceId);
    });

    test('should reject invalid resource ID format', () => {
      const invalidResourceId = 'invalid-resource-id';
      expect(() => resourceIdSchema.parse(invalidResourceId)).toThrow();
    });
  });

  describe('addressSchema', () => {
    test('should validate valid Ethereum address', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b8D42c2D2bb56b7b8C';
      const result = addressSchema.parse(validAddress);
      expect(result).toBe(validAddress);
    });

    test('should reject invalid address format', () => {
      const invalidAddress = 'invalid-address';
      expect(() => addressSchema.parse(invalidAddress)).toThrow();
    });

    test('should reject short address', () => {
      const shortAddress = '0x123456';
      expect(() => addressSchema.parse(shortAddress)).toThrow();
    });
  });

  describe('paymentIdSchema', () => {
    test('should validate valid payment ID', () => {
      const validPaymentId = 'payment-123';
      const result = paymentIdSchema.parse(validPaymentId);
      expect(result).toBe(validPaymentId);
    });

    test('should reject empty payment ID', () => {
      expect(() => paymentIdSchema.parse('')).toThrow();
    });
  });

  describe('validateBody middleware', () => {
    test('should call next() with valid data', () => {
      const req = {
        body: {
          serviceId: '0x1234567890123456789012345678901234567890123456789012345678901234'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const testSchema = require('zod').z.object({
        serviceId: serviceIdSchema
      });

      const middleware = validateBody(testSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedBody).toEqual(req.body);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 400 with validation errors', () => {
      const req = {
        body: {
          serviceId: 'invalid-service-id'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const testSchema = require('zod').z.object({
        serviceId: serviceIdSchema
      });

      const middleware = validateBody(testSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array)
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery middleware', () => {
    test('should call next() with valid query data', () => {
      const req = {
        query: {
          resourceId: '0x1234567890123456789012345678901234567890123456789012345678901234'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const testSchema = require('zod').z.object({
        resourceId: resourceIdSchema
      });

      const middleware = validateQuery(testSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedQuery).toEqual(req.query);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 400 with query validation errors', () => {
      const req = {
        query: {
          resourceId: 'invalid-resource-id'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const testSchema = require('zod').z.object({
        resourceId: resourceIdSchema
      });

      const middleware = validateQuery(testSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Query validation failed',
        details: expect.any(Array)
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});