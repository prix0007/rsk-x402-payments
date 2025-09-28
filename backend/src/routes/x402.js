import express from 'express';
import x402Client from '../x402Client.js';
import config from '../config.js';

const router = express.Router();

// Protected resource endpoint that returns 402 Payment Required when access is needed
router.get('/protected/:serviceId/:resourceId', async (req, res) => {
  try {
    const { serviceId, resourceId } = req.params;
    const userAddress = req.headers['x-user-address'];

    if (!userAddress) {
      return res.status(400).json({
        error: 'Missing x-user-address header'
      });
    }

    // Check if user has valid access (paid subscription or payment)
    const accessResult = await x402Client.checkAccess(userAddress, resourceId);

    if (!accessResult.hasAccess) {
      // Get service details for payment info
      const service = await x402Client.getService(serviceId);

      if (!service) {
        return res.status(404).json({
          error: 'Service not found'
        });
      }

      // Return 402 Payment Required with payment details
      return res.status(402).json({
        error: 'Payment Required',
        code: 402,
        message: 'X402 Payment Required to access this resource',
        payment: {
          serviceId,
          resourceId,
          serviceName: service.name,
          price: x402Client.formatUSDRIF(service.price),
          currency: 'USDRIF',
          network: 'rootstock',
          validityDuration: service.validityDuration,
          description: service.description,
          contractAddresses: {
            paymentGateway: config.network.contracts.paymentGateway,
            usdrifToken: config.network.contracts.usdrifToken
          }
        }
      });
    }

    // User has access, serve the protected content
    res.json({
      success: true,
      data: {
        message: 'Access granted to protected resource',
        resourceId,
        serviceId,
        userAddress,
        accessExpiresAt: accessResult.expiresAt,
        content: {
          title: 'Protected Resource',
          data: 'This is premium content that requires payment to access.',
          timestamp: new Date().toISOString(),
          serviceInfo: {
            name: 'Premium Service',
            description: 'Premium content access'
          }
        }
      }
    });

  } catch (error) {
    console.error('Error accessing protected resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to access resource',
      message: error.message
    });
  }
});

export default router;
