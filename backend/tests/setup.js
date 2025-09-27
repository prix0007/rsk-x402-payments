// Test setup file

// Mock the X402 SDK
jest.mock('@prix0007/x402-payments-sdk', () => ({
  X402Client: jest.fn().mockImplementation(() => ({
    getAllServices: jest.fn(),
    getService: jest.fn(),
    createService: jest.fn(),
    updateService: jest.fn(),
    getServicesByOwner: jest.fn(),
    makePayment: jest.fn(),
    verifyPayment: jest.fn(),
    getPaymentProof: jest.fn(),
    hasActiveSubscription: jest.fn(),
    subscribeToService: jest.fn(),
    checkAccess: jest.fn(),
    requestAccess: jest.fn(),
    grantAccess: jest.fn()
  })),
  LOCAL_NETWORK: {
    name: 'Local Development',
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
    contracts: {
      paymentGateway: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      serviceRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      accessControl: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      usdrifToken: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
    }
  },
  ROOTSTOCK_TESTNET: {
    name: 'Rootstock Testnet',
    chainId: 31,
    rpcUrl: 'https://public-node.testnet.rsk.co',
    contracts: {
      paymentGateway: '0x7CE9684F7216d5B6A628447A7572B03753b9Ea2D',
      serviceRegistry: '0xA1fbD37F47Fd9cdFec3386ee3D80af5B6b4faBd7',
      accessControl: '0xAfD4915897a6E72825e27096E43755b22b514fa7',
      usdrifToken: '0xC331eb6423aDe923F33512b265152d0882462914'
    }
  },
  ROOTSTOCK_MAINNET: {
    name: 'Rootstock Mainnet',
    chainId: 30,
    rpcUrl: 'https://public-node.rsk.co',
    contracts: {
      paymentGateway: '0x0000000000000000000000000000000000000000',
      serviceRegistry: '0x0000000000000000000000000000000000000000',
      accessControl: '0x0000000000000000000000000000000000000000',
      usdrifToken: '0x0000000000000000000000000000000000000000'
    }
  },
  NETWORKS: {},
  generateResourceId: jest.fn().mockReturnValue('0x123456789abcdef'),
  ethers: {
    utils: {
      formatEther: jest.fn().mockReturnValue('1.0'),
      parseEther: jest.fn().mockReturnValue('1000000000000000000')
    }
  }
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.PRIVATE_KEY = '0x1111111111111111111111111111111111111111111111111111111111111111';
process.env.NETWORK = 'local';