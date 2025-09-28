const { ethers } = require("hardhat");
const dotenv = require("dotenv");

// Import from local .env file
dotenv.config()

const networkInfo = {
    "rskTestnet": {
        chainId: 31,
        rpc: "https://public-node.testnet.rsk.co",
    },
    "rootStock": {
        chainId: 30,
        rpc: "https://public-node.rsk.co",
    }
}

async function main() {
    console.log("🚀 Deploying X402 Payment System on Rootstock...");

    let currentNetwork = process.env.HARDHAT_NETWORK;
    if(!currentNetwork) {
        currentNetwork = "local"
    }

    let privateKey = undefined;
    let provider = undefined;
    let deployer = undefined;

    if(currentNetwork === "rskTestnet" || currentNetwork === "rootstock") {
        privateKey = process.env.PRIVATE_KEY;

        const network = networkInfo[currentNetwork];

        console.log(privateKey, network)

        provider = new ethers.providers.JsonRpcProvider(network.rpc);

        deployer = new ethers.Wallet(privateKey, provider);
    }


    if(!deployer) {
        const [fSigner] = await ethers.getSigners();
        deployer = fSigner
    }

    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

    // Deploy MockUSDRIF for testing
    console.log("\n📝 Deploying MockUSDRIF...");
    const MockUSDRIF = await ethers.getContractFactory("MockUSDRIF", deployer);
    const usdrifToken = await MockUSDRIF.deploy(1000000); // 1M initial supply
    await usdrifToken.deployed();
    console.log("MockUSDRIF deployed to:", usdrifToken.address);

    // Deploy Payment Gateway
    console.log("\n💳 Deploying X402PaymentGateway...");
    const PaymentGateway = await ethers.getContractFactory("X402PaymentGateway", deployer);
    const paymentGateway = await PaymentGateway.deploy(usdrifToken.address);
    await paymentGateway.deployed();
    console.log("X402PaymentGateway deployed to:", paymentGateway.address);

    // Deploy Access Control
    console.log("\n🔒 Deploying X402AccessControl...");
    const AccessControl = await ethers.getContractFactory("X402AccessControl", deployer);
    const accessControl = await AccessControl.deploy(paymentGateway.address);
    await accessControl.deployed();
    console.log("X402AccessControl deployed to:", accessControl.address);

    // Deploy Service Registry
    console.log("\n📋 Deploying X402ServiceRegistry...");
    const ServiceRegistry = await ethers.getContractFactory("X402ServiceRegistry", deployer);
    const serviceRegistry = await ServiceRegistry.deploy(paymentGateway.address);
    await serviceRegistry.deployed();
    console.log("X402ServiceRegistry deployed to:", serviceRegistry.address);

    // Authorize ServiceRegistry to update service status in PaymentGateway
    console.log("\n🔐 Authorizing ServiceRegistry in PaymentGateway...");
    await paymentGateway.authorizeService(serviceRegistry.address, true);
    console.log("ServiceRegistry authorized to update service statuses");

    console.log("\n✅ Deployment Summary:");
    console.log("========================");
    console.log("MockUSDRIF:           ", usdrifToken.address);
    console.log("X402PaymentGateway:   ", paymentGateway.address);
    console.log("X402AccessControl:    ", accessControl.address);
    console.log("X402ServiceRegistry:  ", serviceRegistry.address);

    // Create example service
    console.log("\n🔧 Setting up example service...");
    const serviceId = await serviceRegistry.createService(
        "AI API Access",
        "Access to premium AI API endpoints",
        ethers.utils.parseEther("1.0"), // 1 USDRIF
        3600, // 1 hour validity
        ["/api/ai/premium", "/api/ai/advanced"]
    );

    console.log("Example service created!");

    // Mint some tokens to deployer for testing
    console.log("\n🪙 Minting test tokens...");
    await usdrifToken.mint(deployer.address, ethers.utils.parseEther("10000"));
    console.log("Minted 10,000 USDRIF to deployer");

    console.log("\n🎉 Deployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
