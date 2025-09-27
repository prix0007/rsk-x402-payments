// Configuration tests

describe('Configuration', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;

    // Clear module cache to ensure fresh config load
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('should load local network configuration by default', () => {
    process.env = { ...originalEnv, NETWORK: undefined };

    const config = require('../src/config');

    expect(config.network.name).toBe('Local Development');
    expect(config.network.chainId).toBe(31337);
    expect(config.network.rpcUrl).toBe('http://127.0.0.1:8545');
    expect(config.network.contracts).toHaveProperty('paymentGateway');
    expect(config.network.contracts).toHaveProperty('serviceRegistry');
    expect(config.network.contracts).toHaveProperty('accessControl');
    expect(config.network.contracts).toHaveProperty('usdrifToken');
  });

  test('should load testnet configuration when NETWORK=testnet', () => {
    process.env = { ...originalEnv, NETWORK: 'testnet' };

    const config = require('../src/config');

    expect(config.network.name).toBe('Rootstock Testnet');
    expect(config.network.chainId).toBe(31);
    expect(config.network.rpcUrl).toBe('https://public-node.testnet.rsk.co');
  });

  test('should load mainnet configuration when NETWORK=mainnet', () => {
    process.env = { ...originalEnv, NETWORK: 'mainnet' };

    const config = require('../src/config');

    expect(config.network.name).toBe('Rootstock Mainnet');
    expect(config.network.chainId).toBe(30);
    expect(config.network.rpcUrl).toBe('https://public-node.rsk.co');
  });

  test('should handle case-insensitive network names', () => {
    process.env = { ...originalEnv, NETWORK: 'TESTNET' };

    const config = require('../src/config');

    expect(config.network.name).toBe('Rootstock Testnet');
    expect(config.network.chainId).toBe(31);
  });

  test('should override RPC URL when RPC_URL is provided', () => {
    process.env = {
      ...originalEnv,
      NETWORK: 'local',
      RPC_URL: 'http://custom-rpc-url:8545'
    };

    const config = require('../src/config');

    expect(config.rpcUrl).toBe('http://custom-rpc-url:8545');
  });

  test('should use network default RPC URL when RPC_URL is not provided', () => {
    process.env = { ...originalEnv, NETWORK: 'local', RPC_URL: undefined };

    const config = require('../src/config');

    expect(config.rpcUrl).toBe('http://127.0.0.1:8545');
  });

  test('should load correct port configuration', () => {
    process.env = { ...originalEnv, PORT: '4000' };

    const config = require('../src/config');

    expect(config.port).toBe('4000');
  });

  test('should use default port when PORT is not provided', () => {
    process.env = { ...originalEnv, PORT: undefined };

    const config = require('../src/config');

    expect(config.port).toBe(3000);
  });

  test('should load private key from environment', () => {
    const testPrivateKey = '0x2222222222222222222222222222222222222222222222222222222222222222';
    process.env = { ...originalEnv, PRIVATE_KEY: testPrivateKey };

    const config = require('../src/config');

    expect(config.privateKey).toBe(testPrivateKey);
  });

  test('should use default private key when PRIVATE_KEY is not provided', () => {
    process.env = { ...originalEnv, PRIVATE_KEY: undefined };

    const config = require('../src/config');

    expect(config.privateKey).toBe('0x1111111111111111111111111111111111111111111111111111111111111111');
  });

  test('should load API configuration correctly', () => {
    process.env = {
      ...originalEnv,
      API_BASE_URL: 'https://api.example.com',
      CORS_ORIGIN: 'https://frontend.example.com'
    };

    const config = require('../src/config');

    expect(config.apiBaseUrl).toBe('https://api.example.com');
    expect(config.corsOrigin).toBe('https://frontend.example.com');
  });

  test('should use default API configuration when not provided', () => {
    process.env = {
      ...originalEnv,
      API_BASE_URL: undefined,
      CORS_ORIGIN: undefined
    };

    const config = require('../src/config');

    expect(config.apiBaseUrl).toBe('http://localhost:3000');
    expect(config.corsOrigin).toBe('http://localhost:3000');
  });

  test('should set NODE_ENV correctly', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };

    const config = require('../src/config');

    expect(config.nodeEnv).toBe('production');
  });
});