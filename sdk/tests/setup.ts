import { ethers } from 'ethers';

// Test constants
export const TEST_PRIVATE_KEY = `0x${  '1'.repeat(64)}`;
export const TEST_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
export const TEST_RPC_URL = 'http://localhost:8545';

// Mock contract addresses
export const MOCK_CONTRACTS = {
  paymentGateway: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  serviceRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  accessControl: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  usdrifToken: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
};

// Mock Provider
export const mockProvider = {
  getNetwork: jest.fn().mockResolvedValue({ chainId: 31337, name: 'localhost' }),
  getBalance: jest.fn().mockResolvedValue(ethers.utils.parseEther('100')),
  getTransactionCount: jest.fn().mockResolvedValue(0),
  estimateGas: jest.fn().mockResolvedValue(ethers.BigNumber.from('21000')),
  getGasPrice: jest.fn().mockResolvedValue(ethers.utils.parseUnits('20', 'gwei')),
  call: jest.fn().mockResolvedValue('0x'),
  waitForTransaction: jest.fn().mockResolvedValue({
    blockHash: '0x123',
    blockNumber: 1,
    transactionHash: '0x456',
    logs: [],
    status: 1,
  }),
  sendTransaction: jest.fn().mockResolvedValue({
    hash: '0x789',
    wait: jest.fn().mockResolvedValue({
      blockHash: '0x123',
      blockNumber: 1,
      transactionHash: '0x789',
      logs: [],
      status: 1,
    }),
  }),
};

// Mock Signer
export const mockSigner = {
  provider: mockProvider,
  getAddress: jest.fn().mockResolvedValue(TEST_ADDRESS),
  sendTransaction: jest.fn().mockResolvedValue({
    hash: '0x789',
    wait: jest.fn().mockResolvedValue({
      blockHash: '0x123',
      blockNumber: 1,
      transactionHash: '0x789',
      logs: [],
      status: 1,
    }),
  }),
  signMessage: jest.fn().mockResolvedValue('0xsignature'),
  connect: jest.fn(),
};

// Mock Contract
export const createMockContract = (address: string) => ({
  address,
  deployed: jest.fn().mockResolvedValue(true),
  interface: {
    parseLog: jest.fn().mockReturnValue({
      name: 'MockEvent',
      args: ['0x123', TEST_ADDRESS, ethers.utils.parseEther('1')],
    }),
  },
  // Common contract methods
  getAllServices: jest.fn().mockResolvedValue([]),
  getService: jest.fn().mockResolvedValue(null),
  registerService: jest.fn().mockResolvedValue({ hash: '0x123' }),
  updateService: jest.fn().mockResolvedValue({ hash: '0x123' }),
  makePayment: jest.fn().mockResolvedValue({ hash: '0x123' }),
  verifyPayment: jest.fn().mockResolvedValue(true),
  hasAccess: jest.fn().mockResolvedValue(true),
  grantAccess: jest.fn().mockResolvedValue({ hash: '0x123' }),
  revokeAccess: jest.fn().mockResolvedValue({ hash: '0x123' }),
  balanceOf: jest.fn().mockResolvedValue(ethers.utils.parseEther('100')),
  allowance: jest.fn().mockResolvedValue(ethers.utils.parseEther('100')),
  approve: jest.fn().mockResolvedValue({ hash: '0x123' }),
  transfer: jest.fn().mockResolvedValue({ hash: '0x123' }),
});

// Mock contracts
export const mockContracts = {
  paymentGateway: createMockContract(MOCK_CONTRACTS.paymentGateway),
  serviceRegistry: createMockContract(MOCK_CONTRACTS.serviceRegistry),
  accessControl: createMockContract(MOCK_CONTRACTS.accessControl),
  usdrifToken: createMockContract(MOCK_CONTRACTS.usdrifToken),
};

// Test data generators
export const generateTestService = () => ({
  id: `0x${  '1'.repeat(64)}`,
  name: 'Test Service',
  description: 'Test service description',
  owner: TEST_ADDRESS,
  price: ethers.utils.parseEther('0.1'),
  validityDuration: 3600,
  endpoints: ['/api/test'],
  active: true,
  totalPayments: 0,
  totalRevenue: ethers.BigNumber.from('0'),
});

export const generateTestPayment = () => ({
  id: `0x${  '2'.repeat(64)}`,
  payer: TEST_ADDRESS,
  recipient: `0x${  '3'.repeat(40)}`,
  amount: ethers.utils.parseEther('0.1'),
  timestamp: Math.floor(Date.now() / 1000),
  resourceId: `0x${  '4'.repeat(64)}`,
  verified: true,
});

// Setup global test environment
beforeEach(() => {
  jest.clearAllMocks();
});