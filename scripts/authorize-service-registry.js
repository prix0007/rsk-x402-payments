const { ethers } = require("hardhat");
const dotenv = require("dotenv");

// Import from local .env file
dotenv.config();

// Contract addresses from SDK config
const TESTNET_ADDRESSES = {
    paymentGateway: '0x7CE9684F7216d5B6A628447A7572B03753b9Ea2D',
    serviceRegistry: '0xA1fbD37F47Fd9cdFec3386ee3D80af5B6b4faBd7',
    accessControl: '0xAfD4915897a6E72825e27096E43755b22b514fa7',
    usdrifToken: '0xC331eb6423aDe923F33512b265152d0882462914',
};

const LOCAL_ADDRESSES = {
    paymentGateway: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    serviceRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    accessControl: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    usdrifToken: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
};

const networkInfo = {
    "rskTestnet": {
        chainId: 31,
        rpc: "https://public-node.testnet.rsk.co",
        addresses: TESTNET_ADDRESSES
    },
    "rootstock": {
        chainId: 30,
        rpc: "https://public-node.rsk.co",
        addresses: TESTNET_ADDRESSES // Use testnet addresses for now
    },
    "local": {
        chainId: 31337,
        rpc: "http://127.0.0.1:8545",
        addresses: LOCAL_ADDRESSES
    }
};

async function main() {
    console.log("🔐 Authorizing ServiceRegistry in PaymentGateway...");

    let currentNetwork = process.env.HARDHAT_NETWORK || process.env.NETWORK || "local";
    console.log("Network:", currentNetwork);

    let privateKey = undefined;
    let provider = undefined;
    let deployer = undefined;
    let addresses = undefined;

    if (currentNetwork === "rskTestnet" || currentNetwork === "rootstock") {
        privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("PRIVATE_KEY environment variable is required for testnet/mainnet");
        }

        const network = networkInfo[currentNetwork];
        addresses = network.addresses;

        provider = new ethers.providers.JsonRpcProvider(network.rpc);
        deployer = new ethers.Wallet(privateKey, provider);
    } else {
        // Local network
        const [fSigner] = await ethers.getSigners();
        deployer = fSigner;
        addresses = networkInfo.local.addresses;
    }

    console.log("Using account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

    // Get contract instances
    const PaymentGateway = await ethers.getContractFactory("X402PaymentGateway", deployer);
    const paymentGateway = PaymentGateway.attach(addresses.paymentGateway);

    console.log("\nContract addresses:");
    console.log("PaymentGateway:", addresses.paymentGateway);
    console.log("ServiceRegistry:", addresses.serviceRegistry);

    // Check current authorization status
    console.log("\n🔍 Checking current authorization status...");
    try {
        // Check if ServiceRegistry is already authorized (this may not be a public function)
        console.log("ServiceRegistry address to authorize:", addresses.serviceRegistry);
    } catch (error) {
        console.log("Could not check current status:", error.message);
    }

    // Authorize ServiceRegistry to update service status in PaymentGateway
    console.log("\n🔐 Authorizing ServiceRegistry...");
    try {
        const tx = await paymentGateway.authorizeService(addresses.serviceRegistry, true);
        console.log("Authorization transaction hash:", tx.hash);

        console.log("Waiting for transaction confirmation...");
        await tx.wait();

        console.log("✅ ServiceRegistry successfully authorized!");
        console.log("ServiceRegistry can now update service statuses in PaymentGateway");

    } catch (error) {
        console.error("❌ Authorization failed:", error.message);

        if (error.message.includes("Ownable: caller is not the owner")) {
            console.log("\n💡 The account you're using is not the owner of the PaymentGateway contract.");
            console.log("Make sure you're using the same private key that deployed the contracts.");
        } else if (error.message.includes("Not authorized")) {
            console.log("\n💡 The current account doesn't have permission to authorize services.");
        }

        throw error;
    }

    console.log("\n🎉 Authorization complete!");
    console.log("\nNow you should be able to activate/deactivate services from the frontend without the 'Not authorized' error.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });