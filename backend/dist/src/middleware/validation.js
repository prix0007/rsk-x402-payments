const { z } = require('zod');

// Basic validation schemas for parameters that are still used
const serviceIdSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid service ID format');
const resourceIdSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid resource ID format');
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format');
const paymentIdSchema = z.string().min(1, 'Payment ID required');

// Middleware to validate request body
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const value = schema.parse(req.body);
      req.validatedBody = value;
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      });
    }
  };
};

// Middleware to validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const value = schema.parse(req.query);
      req.validatedQuery = value;
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Query validation failed',
        details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      });
    }
  };
};

module.exports = {
  serviceIdSchema,
  resourceIdSchema,
  addressSchema,
  paymentIdSchema,
  validateBody,
  validateQuery
};