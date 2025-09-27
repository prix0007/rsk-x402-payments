const express = require('express');
const x402Client = require('../x402Client');

const router = express.Router();

// Verify payment
router.get('/verify/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { resourceId } = req.query;

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        error: 'resourceId query parameter is required'
      });
    }

    const verification = await x402Client.verifyPayment(paymentId, resourceId);

    res.json({
      success: true,
      data: {
        valid: verification.valid,
        payer: verification.payer
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      message: error.message
    });
  }
});

// Get payment proof
router.get('/proof/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const proof = await x402Client.getPaymentProof(paymentId);

    res.json({
      success: true,
      data: proof
    });
  } catch (error) {
    console.error('Error getting payment proof:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment proof',
      message: error.message
    });
  }
});

// Check subscription status
router.get('/subscription/:serviceId/:subscriber', async (req, res) => {
  try {
    const { serviceId, subscriber } = req.params;

    const hasActiveSubscription = await x402Client.hasActiveSubscription(subscriber, serviceId);

    res.json({
      success: true,
      data: {
        hasActiveSubscription,
        subscriber,
        serviceId
      }
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check subscription',
      message: error.message
    });
  }
});

module.exports = router;