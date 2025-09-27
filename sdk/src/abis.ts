// Contract ABIs - Extracted from the compiled contracts

export const PAYMENT_GATEWAY_ABI = [
  "function registerService(bytes32 serviceId, address recipient, uint256 price, uint256 validityDuration) external",
  "function makePayment(bytes32 serviceId, bytes32 resourceId) external returns (bytes32 paymentId)",
  "function makePaymentFrom(address payer, bytes32 serviceId, bytes32 resourceId) public returns (bytes32 paymentId)",
  "function verifyPayment(bytes32 paymentId, bytes32 resourceId, uint256 validityDuration) external view returns (bool valid, address payer)",
  "function verifyPaymentForService(bytes32 paymentId, bytes32 serviceId) external view returns (bool valid, address payer)",
  "function updateServiceStatus(bytes32 serviceId, bool active) external",
  "function updateServicePrice(bytes32 serviceId, uint256 newPrice) external",
  "function authorizeService(address service, bool authorized) external",
  "function generateResourceId(string memory resource, address requester) public pure returns (bytes32)",
  "function generateServiceId(string memory serviceName) public pure returns (bytes32)",
  "function getPaymentInfo(bytes32 paymentId) external view returns (address payer, address recipient, uint256 amount, uint256 timestamp, bytes32 resourceId, bool verified)",
  "function getServiceInfo(bytes32 serviceId) external view returns (address recipient, uint256 price, uint256 validityDuration, bool active)",
  "function owner() public view returns (address)",
  "function usdrifToken() public view returns (address)",
  "function MIN_PAYMENT() public view returns (uint256)",
  "event PaymentMade(bytes32 indexed paymentId, address indexed payer, address indexed recipient, uint256 amount, bytes32 resourceId)",
  "event ServiceRegistered(bytes32 indexed serviceId, address indexed recipient, uint256 price)",
  "event AccessGranted(bytes32 indexed paymentId, address indexed payer, bytes32 indexed resourceId)"
];

export const SERVICE_REGISTRY_ABI = [
  "function createService(string memory name, string memory description, uint256 price, uint256 validityDuration, string[] memory endpoints) external returns (bytes32 serviceId)",
  "function subscribeToService(bytes32 serviceId, bytes32 resourceId) external returns (bytes32 paymentId)",
  "function updateService(bytes32 serviceId, uint256 newPrice, bool active) external",
  "function addEndpoint(bytes32 serviceId, string memory endpoint) external",
  "function hasActiveSubscription(address subscriber, bytes32 serviceId) external view returns (bool)",
  "function getServiceInfo(bytes32 serviceId) external view returns (string memory name, string memory description, address owner, uint256 price, uint256 validityDuration, bool active, uint256 totalPayments, uint256 totalRevenue)",
  "function getServiceEndpoints(bytes32 serviceId) external view returns (string[] memory)",
  "function getServicesByOwner(address owner) external view returns (bytes32[] memory)",
  "function getAllServices() external view returns (bytes32[] memory)",
  "function getSubscriptionInfo(bytes32 serviceId, address subscriber) external view returns (address sub, uint256 expiresAt, bool active)",
  "function paymentGateway() public view returns (address)",
  "event ServiceCreated(bytes32 indexed serviceId, address indexed owner, string name, uint256 price)",
  "event ServiceUpdated(bytes32 indexed serviceId, uint256 newPrice, bool active)",
  "event SubscriptionCreated(bytes32 indexed serviceId, address indexed subscriber, uint256 expiresAt)"
];

export const ACCESS_CONTROL_ABI = [
  "function requestAccess(bytes32 resourceId, bytes32 paymentId) external returns (bytes32 requestId)",
  "function grantAccessWithPayment(bytes32 requestId, bytes32 paymentId) external",
  "function checkAccess(address user, bytes32 resourceId, uint256 validityPeriod) external view returns (bool hasAccess)",
  "function hasValidAccess(address user, bytes32 resourceId) external view returns (bool)",
  "function paymentGateway() public view returns (address)",
  "function accessRequests(bytes32 requestId) external view returns (bytes32 resourceId, address requester, uint256 timestamp, bool granted)",
  "function lastAccess(bytes32 resourceId, address user) external view returns (uint256)",
  "event AccessRequested(bytes32 indexed requestId, address indexed requester, bytes32 indexed resourceId)",
  "event AccessGranted(bytes32 indexed requestId, address indexed requester, bytes32 indexed resourceId, bytes32 paymentId)",
  "event AccessDenied(bytes32 indexed requestId, address indexed requester, bytes32 indexed resourceId, string reason)"
];

export const USDRIF_TOKEN_ABI = [
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function decimals() public view returns (uint8)",
  "function totalSupply() public view returns (uint256)",
  "function balanceOf(address owner) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function transfer(address to, uint256 value) public returns (bool)",
  "function transferFrom(address from, address to, uint256 value) public returns (bool)",
  "function approve(address spender, uint256 value) public returns (bool)",
  "function mint(address to, uint256 amount) external",
  "function faucet() external",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];