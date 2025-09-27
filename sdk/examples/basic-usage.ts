import { X402Client, LOCAL_NETWORK, ROOTSTOCK_TESTNET, parseUSDRIF } from '../src';

// Example: Basic X402 SDK Usage

async function basicExample() {
  // Initialize the client with a private key
  const client = new X402Client({
    network: ROOTSTOCK_TESTNET,
    privateKey: 'c2996cd94620937334d3b3a5e3ce3170b070085935a535f5db2192fbe334c6be', // Replace with actual private key
  });

  console.log('🚀 X402 SDK Basic Example');
  console.log('Network:', client.getNetworkConfig().name);

  try {
    // 1. Create a service
    console.log('\n📋 Creating a service...');
    const serviceId = await client.createService({
      name: 'AI Chat API',
      description: 'Premium AI chat service with GPT-4',
      price: parseUSDRIF('0.1'), // 0.1 USDRIF per access
      validityDuration: 3600, // 1 hour
      endpoints: ['/api/chat', '/api/chat/premium'],
    });

    console.log('✅ Service created with ID:', serviceId);

    // 2. Get service information
    const service = await client.getService(serviceId);
    console.log('📊 Service info:', {
      name: service.name,
      price: client.formatUSDRIF(service.price),
      owner: service.owner,
    });

    // 3. Subscribe to the service (make payment)
    console.log('\n💰 Subscribing to service...');
    const payment = await client.subscribeToService({
      serviceId: serviceId,
    });

    console.log('✅ Payment successful!');
    console.log('Payment ID:', payment.paymentId);
    console.log('Transaction:', payment.transactionHash);

    // 4. Verify the payment
    const userAddress = await client.getSignerAddress();
    const resourceId = client.generateResourceId('AI Chat API', userAddress);

    const verification = await client.verifyPayment(
      payment.paymentId,
      resourceId,
      3600 // 1 hour validity
    );

    console.log('🔍 Payment verification:', verification);

    // 5. Check subscription status
    const hasSubscription = await client.hasActiveSubscription(userAddress, serviceId);
    console.log('📝 Has active subscription:', hasSubscription);

    // 6. Request access to resource
    console.log('\n🔐 Requesting access...');
    const requestId = await client.requestAccess(resourceId, payment.paymentId);
    console.log('✅ Access requested with ID:', requestId);

    // 7. Check access
    const accessResult = await client.checkAccess(userAddress, resourceId);
    console.log('🔓 Access check result:', accessResult);

    console.log('\n🎉 Example completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example: Service Discovery
async function serviceDiscoveryExample() {
  const client = new X402Client({
    network: LOCAL_NETWORK,
    // Read-only operations don't need a private key
  });

  console.log('\n🔍 Service Discovery Example');

  try {
    // Get all services
    const allServices = await client.getAllServices();
    console.log(`Found ${allServices.length} services:`);

    allServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}`);
      console.log(`   Price: ${client.formatUSDRIF(service.price)} USDRIF`);
      console.log(`   Endpoints: ${service.endpoints.join(', ')}`);
      console.log(`   Active: ${service.active}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example: Balance and Approval Management
async function balanceExample() {
  const client = new X402Client({
    network: LOCAL_NETWORK,
    privateKey: 'your-private-key-here',
  });

  console.log('\n💰 Balance Management Example');

  try {
    // Check USDRIF balance
    const balance = await client.getBalance();
    console.log('💵 USDRIF Balance:', client.formatUSDRIF(balance));

    // Check allowance
    const allowance = await client.getAllowance();
    console.log('🔓 Current Allowance:', client.formatUSDRIF(allowance));

    // Approve USDRIF spending
    const approvalAmount = parseUSDRIF('10.0'); // Approve 10 USDRIF
    console.log('⏳ Approving USDRIF spending...');
    await client.approveUSDRIF(approvalAmount);
    console.log('✅ Approval completed');

    // Check new allowance
    const newAllowance = await client.getAllowance();
    console.log('🆕 New Allowance:', client.formatUSDRIF(newAllowance));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run examples
if (require.main === module) {
  console.log('Choose an example to run:');
  console.log('1. Basic Usage: node basic-usage.js basic');
  console.log('2. Service Discovery: node basic-usage.js discovery');
  console.log('3. Balance Management: node basic-usage.js balance');

  const arg = process.argv[2];

  switch (arg) {
    case 'basic':
      basicExample();
      break;
    case 'discovery':
      serviceDiscoveryExample();
      break;
    case 'balance':
      balanceExample();
      break;
    default:
      basicExample();
  }
}

export { basicExample, serviceDiscoveryExample, balanceExample };
