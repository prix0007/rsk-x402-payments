import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config.js';

// Import routes
import servicesRouter from './routes/services.js';
import paymentsRouter from './routes/payments.js';
import x402Router from './routes/x402.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Logging middleware
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
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
      name: config.network.name,
      chainId: config.network.chainId,
      rpcUrl: config.network.rpcUrl
    },
    documentation: {
      'X402 Protocol': 'HTTP-native payments for API access',
      'Usage': 'Send requests with X-User-Address header to access protected resources'
    }
  });
});


// Route handlers
app.use('/api/services', servicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/x402', x402Router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  if (err.code === 'NETWORK_ERROR') {
    return res.status(503).json({
      error: 'Network Error',
      message: 'Blockchain network is unavailable'
    });
  }

  // Generic error response
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'GET /api/services',
      'POST /api/services',
      'GET /api/services/:serviceId',
      'POST /api/payments',
      'GET /api/payments/verify/:paymentId',
      'GET /api/x402/protected/:serviceId/:resourceId',
      'GET /api/x402/access/:resourceId'
    ]
  });
});

// Start server
const port = config.port;
app.listen(port, () => {
  console.log(`🚀 X402 Backend Server running on port ${port}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Network: ${config.network.name} (Chain ID: ${config.network.chainId})`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log(`❤️  Health Check: http://localhost:${port}/health`);
});

export default app;
