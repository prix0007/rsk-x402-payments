import express from 'express';
import x402Client from '../x402Client.js';

const router = express.Router();

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await x402Client.getAllServices();

    res.json({
      success: true,
      data: services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        owner: service.owner,
        price: x402Client.formatUSDRIF(service.price),
        validityDuration: service.validityDuration,
        endpoints: service.endpoints,
        active: service.active,
        totalPayments: service.totalPayments,
        totalRevenue: x402Client.formatUSDRIF(service.totalRevenue)
      }))
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services',
      message: error.message
    });
  }
});

// Get service by ID
router.get('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await x402Client.getService(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: service.id,
        name: service.name,
        description: service.description,
        owner: service.owner,
        price: x402Client.formatUSDRIF(service.price),
        validityDuration: service.validityDuration,
        endpoints: service.endpoints,
        active: service.active,
        totalPayments: service.totalPayments,
        totalRevenue: x402Client.formatUSDRIF(service.totalRevenue)
      }
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service',
      message: error.message
    });
  }
});

// Get services by owner
router.get('/owner/:ownerAddress', async (req, res) => {
  try {
    const { ownerAddress } = req.params;

    const services = await x402Client.getServicesByOwner(ownerAddress?.trim());

    res.json({
      success: true,
      data: services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        owner: service.owner,
        price: x402Client.formatUSDRIF(service.price),
        validityDuration: service.validityDuration,
        endpoints: service.endpoints,
        active: service.active,
        totalPayments: service.totalPayments,
        totalRevenue: x402Client.formatUSDRIF(service.totalRevenue)
      }))
    });
  } catch (error) {
    console.error('Error fetching services by owner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services by owner',
      message: error.message
    });
  }
});

export default router;
