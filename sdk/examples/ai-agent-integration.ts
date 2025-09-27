import { X402Client, LOCAL_NETWORK, parseUSDRIF } from '../src';

// Example: AI Agent Integration with X402 Payments

class AIAgent {
  private x402: X402Client;
  private agentId: string;

  constructor(privateKey: string, agentId: string) {
    this.x402 = new X402Client({
      network: LOCAL_NETWORK,
      privateKey,
    });
    this.agentId = agentId;
  }

  /**
   * Discover available AI services
   */
  async discoverServices() {
    console.log(`🤖 ${this.agentId}: Discovering available services...`);

    const services = await this.x402.getAllServices();
    const aiServices = services.filter(s =>
      s.name.toLowerCase().includes('ai') ||
      s.description.toLowerCase().includes('ai')
    );

    console.log(`Found ${aiServices.length} AI services:`);
    aiServices.forEach(service => {
      console.log(`  - ${service.name}: ${this.x402.formatUSDRIF(service.price)} USDRIF`);
    });

    return aiServices;
  }

  /**
   * Subscribe to a service for AI tasks
   */
  async subscribeToAIService(serviceId: string, taskType: string) {
    console.log(`🤖 ${this.agentId}: Subscribing to service for ${taskType}...`);

    try {
      // Generate resource ID based on agent and task
      const resourceId = this.x402.generateResourceId(
        `${taskType}-${this.agentId}`,
        await this.x402.getSignerAddress()
      );

      // Subscribe to service
      const payment = await this.x402.subscribeToService({
        serviceId,
        resourceId,
      });

      console.log(`✅ ${this.agentId}: Subscription successful!`);
      console.log(`   Payment ID: ${payment.paymentId}`);
      console.log(`   Resource ID: ${resourceId}`);

      return { payment, resourceId };

    } catch (error) {
      console.error(`❌ ${this.agentId}: Subscription failed:`, error.message);
      throw error;
    }
  }

  /**
   * Access an AI service endpoint
   */
  async accessService(resourceId: string, endpoint: string) {
    console.log(`🤖 ${this.agentId}: Accessing ${endpoint}...`);

    try {
      const userAddress = await this.x402.getSignerAddress();

      // Check if we have valid access
      const hasAccess = await this.x402.hasValidAccess(userAddress, resourceId);

      if (!hasAccess) {
        console.log(`🔒 ${this.agentId}: No valid access, requesting...`);
        await this.x402.requestAccess(resourceId);
      }

      // Simulate API call
      console.log(`🔄 ${this.agentId}: Making API call to ${endpoint}...`);

      // In real implementation, you would make the actual HTTP request here
      // const response = await fetch(`https://api.service.com${endpoint}`, {
      //   headers: {
      //     'X-Payment-Proof': paymentId,
      //     'X-Resource-ID': resourceId,
      //   }
      // });

      console.log(`✅ ${this.agentId}: API call successful`);
      return { success: true, data: 'AI response data' };

    } catch (error) {
      console.error(`❌ ${this.agentId}: Access failed:`, error.message);
      throw error;
    }
  }

  /**
   * Monitor spending and usage
   */
  async getUsageReport() {
    const userAddress = await this.x402.getSignerAddress();
    const balance = await this.x402.getBalance();

    console.log(`📊 ${this.agentId} Usage Report:`);
    console.log(`   Current Balance: ${this.x402.formatUSDRIF(balance)} USDRIF`);

    // In a real implementation, you could track payments and usage
    // by listening to events or storing local records

    return {
      balance: this.x402.formatUSDRIF(balance),
      // Add more usage metrics here
    };
  }
}

// Example: Multi-Agent Workflow
async function multiAgentWorkflow() {
  console.log('🚀 Multi-Agent X402 Workflow Example\n');

  // Create multiple AI agents
  const agents = [
    new AIAgent('private-key-1', 'DataAnalysisAgent'),
    new AIAgent('private-key-2', 'TextGenerationAgent'),
    new AIAgent('private-key-3', 'ImageProcessingAgent'),
  ];

  try {
    // 1. Service provider creates AI services
    const serviceProvider = new X402Client({
      network: LOCAL_NETWORK,
      privateKey: 'service-provider-private-key',
    });

    console.log('🏗️  Service Provider: Creating AI services...');

    const services = await Promise.all([
      serviceProvider.createService({
        name: 'Advanced Data Analytics AI',
        description: 'Machine learning models for data analysis',
        price: parseUSDRIF('0.05'),
        validityDuration: 7200, // 2 hours
        endpoints: ['/api/analytics', '/api/ml-models'],
      }),
      serviceProvider.createService({
        name: 'GPT-4 Text Generation',
        description: 'Advanced text generation and completion',
        price: parseUSDRIF('0.02'),
        validityDuration: 3600, // 1 hour
        endpoints: ['/api/text/generate', '/api/text/complete'],
      }),
      serviceProvider.createService({
        name: 'AI Image Processing',
        description: 'Computer vision and image analysis',
        price: parseUSDRIF('0.08'),
        validityDuration: 5400, // 1.5 hours
        endpoints: ['/api/vision', '/api/image/analyze'],
      }),
    ]);

    console.log(`✅ Created ${services.length} AI services\n`);

    // 2. Each agent discovers and subscribes to relevant services
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const serviceId = services[i];

      console.log(`--- ${agent.agentId} Workflow ---`);

      // Discover services
      await agent.discoverServices();

      // Subscribe to relevant service
      const subscription = await agent.subscribeToAIService(
        serviceId,
        ['data-analysis', 'text-generation', 'image-processing'][i]
      );

      // Access the service
      const endpoints = ['/api/analytics', '/api/text/generate', '/api/vision'];
      await agent.accessService(subscription.resourceId, endpoints[i]);

      // Get usage report
      await agent.getUsageReport();

      console.log('');
    }

    console.log('🎉 Multi-agent workflow completed successfully!');

  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
  }
}

// Example: Automated Payment and Access Management
async function automatedPaymentWorkflow() {
  console.log('🔄 Automated Payment Workflow Example\n');

  const agent = new AIAgent('agent-private-key', 'AutomatedAgent');

  try {
    // 1. Discover and select cheapest AI service
    const services = await agent.discoverServices();
    const cheapestService = services.reduce((prev, current) =>
      prev.price.lt(current.price) ? prev : current
    );

    console.log(`🎯 Selected cheapest service: ${cheapestService.name}`);

    // 2. Auto-subscribe with retry logic
    let subscription;
    let retries = 3;

    while (retries > 0) {
      try {
        subscription = await agent.subscribeToAIService(
          cheapestService.id,
          'automated-task'
        );
        break;
      } catch (error) {
        retries--;
        console.log(`⚠️  Subscription failed, retrying... (${retries} left)`);
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      }
    }

    // 3. Automated access with monitoring
    const startTime = Date.now();
    let apiCalls = 0;

    // Simulate multiple API calls over time
    for (let i = 0; i < 5; i++) {
      await agent.accessService(subscription.resourceId, '/api/automated');
      apiCalls++;

      // Check if subscription is still valid
      const userAddress = await agent.x402.getSignerAddress();
      const hasAccess = await agent.x402.hasValidAccess(userAddress, subscription.resourceId);

      if (!hasAccess) {
        console.log('🔄 Subscription expired, renewing...');
        subscription = await agent.subscribeToAIService(
          cheapestService.id,
          'automated-task-renewal'
        );
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between calls
    }

    const endTime = Date.now();
    console.log(`\n📈 Automation completed:`);
    console.log(`   API Calls: ${apiCalls}`);
    console.log(`   Duration: ${(endTime - startTime) / 1000}s`);

    await agent.getUsageReport();

  } catch (error) {
    console.error('❌ Automated workflow failed:', error.message);
  }
}

// Run examples
if (require.main === module) {
  const arg = process.argv[2];

  switch (arg) {
    case 'multi':
      multiAgentWorkflow();
      break;
    case 'auto':
      automatedPaymentWorkflow();
      break;
    default:
      console.log('AI Agent Integration Examples:');
      console.log('1. Multi-Agent: node ai-agent-integration.js multi');
      console.log('2. Automated: node ai-agent-integration.js auto');
      multiAgentWorkflow();
  }
}

export { AIAgent, multiAgentWorkflow, automatedPaymentWorkflow };