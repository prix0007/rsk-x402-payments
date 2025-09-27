import { X402Client } from '../src/X402Client';
import { LOCAL_NETWORK } from '../src/config';
import { TEST_PRIVATE_KEY } from './setup';

describe('Basic SDK Tests', () => {
  describe('X402Client Constructor', () => {
    it('should create X402Client instance', () => {
      expect(() => {
        new X402Client({
          network: LOCAL_NETWORK,
          privateKey: TEST_PRIVATE_KEY,
        });
      }).not.toThrow();
    });

    it('should create client without throwing', () => {
      const client = new X402Client({
        network: LOCAL_NETWORK,
        privateKey: TEST_PRIVATE_KEY,
      });

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(X402Client);
    });
  });

  describe('Configuration', () => {
    it('should have all required contract addresses', () => {
      expect(LOCAL_NETWORK.contracts.paymentGateway).toBeDefined();
      expect(LOCAL_NETWORK.contracts.serviceRegistry).toBeDefined();
      expect(LOCAL_NETWORK.contracts.accessControl).toBeDefined();
      expect(LOCAL_NETWORK.contracts.usdrifToken).toBeDefined();
    });

    it('should have valid RPC URL', () => {
      expect(LOCAL_NETWORK.rpcUrl).toBe('http://127.0.0.1:8545');
    });
  });

  describe('Client Methods', () => {
    let client: X402Client;

    beforeEach(() => {
      client = new X402Client({
        network: LOCAL_NETWORK,
        privateKey: TEST_PRIVATE_KEY,
      });
    });

    it('should have getAllServices method', () => {
      expect(typeof client.getAllServices).toBe('function');
    });

    it('should have getService method', () => {
      expect(typeof client.getService).toBe('function');
    });

    it('should have createService method', () => {
      expect(typeof client.createService).toBe('function');
    });

    it('should have makePayment method', () => {
      expect(typeof client.makePayment).toBe('function');
    });

    it('should have verifyPayment method', () => {
      expect(typeof client.verifyPayment).toBe('function');
    });

    it('should have checkAccess method', () => {
      expect(typeof client.checkAccess).toBe('function');
    });
  });
});