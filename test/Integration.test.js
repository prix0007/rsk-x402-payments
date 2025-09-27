const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("X402 Integration Tests", function () {
    let paymentGateway;
    let accessControl;
    let serviceRegistry;
    let usdrifToken;
    let owner;
    let apiProvider;
    let aiAgent;
    let regularUser;

    const API_PRICE = ethers.utils.parseEther("0.5");
    const PREMIUM_PRICE = ethers.utils.parseEther("2.0");
    const VALIDITY_DURATION = 3600; // 1 hour

    beforeEach(async function () {
        [owner, apiProvider, aiAgent, regularUser] = await ethers.getSigners();

        // Deploy MockUSDRIF
        const MockUSDRIF = await ethers.getContractFactory("MockUSDRIF");
        usdrifToken = await MockUSDRIF.deploy(1000000);
        await usdrifToken.deployed();

        // Deploy PaymentGateway
        const PaymentGateway = await ethers.getContractFactory("X402PaymentGateway");
        paymentGateway = await PaymentGateway.deploy(usdrifToken.address);
        await paymentGateway.deployed();

        // Deploy AccessControl
        const AccessControl = await ethers.getContractFactory("X402AccessControl");
        accessControl = await AccessControl.deploy(paymentGateway.address);
        await accessControl.deployed();

        // Deploy ServiceRegistry
        const ServiceRegistry = await ethers.getContractFactory("X402ServiceRegistry");
        serviceRegistry = await ServiceRegistry.deploy(paymentGateway.address);
        await serviceRegistry.deployed();

        // Authorize ServiceRegistry to call PaymentGateway
        await paymentGateway.authorizeService(serviceRegistry.address, true);

        // Setup tokens for all users
        const users = [apiProvider, aiAgent, regularUser];
        for (const user of users) {
            await usdrifToken.mint(user.address, ethers.utils.parseEther("1000"));
            // Approve tokens to payment gateway (for direct payments)
            await usdrifToken.connect(user).approve(
                paymentGateway.address,
                ethers.utils.parseEther("1000")
            );
        }
    });

    describe("Complete Payment Flow", function () {
        let basicServiceId;
        let premiumServiceId;

        beforeEach(async function () {
            // API provider creates basic service
            const basicTx = await serviceRegistry.connect(apiProvider).createService(
                "Basic AI API",
                "Basic AI API access",
                API_PRICE,
                VALIDITY_DURATION,
                ["/api/basic", "/api/query"]
            );

            const basicReceipt = await basicTx.wait();
            const basicEvent = basicReceipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            basicServiceId = serviceRegistry.interface.parseLog(basicEvent).args[0];

            // API provider creates premium service
            const premiumTx = await serviceRegistry.connect(apiProvider).createService(
                "Premium AI API",
                "Advanced AI API with enhanced features",
                PREMIUM_PRICE,
                VALIDITY_DURATION * 2, // 2 hours
                ["/api/premium", "/api/advanced", "/api/analytics"]
            );

            const premiumReceipt = await premiumTx.wait();
            const premiumEvent = premiumReceipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            premiumServiceId = serviceRegistry.interface.parseLog(premiumEvent).args[0];
        });

        it("Should complete full AI agent workflow", async function () {
            // Step 1: AI Agent discovers available services
            const allServices = await serviceRegistry.getAllServices();
            expect(allServices).to.include(basicServiceId);
            expect(allServices).to.include(premiumServiceId);

            // Step 2: AI Agent checks service details
            const basicServiceInfo = await serviceRegistry.getServiceInfo(basicServiceId);
            const premiumServiceInfo = await serviceRegistry.getServiceInfo(premiumServiceId);

            expect(basicServiceInfo.price).to.equal(API_PRICE);
            expect(premiumServiceInfo.price).to.equal(PREMIUM_PRICE);

            // Step 3: AI Agent subscribes to basic service
            const basicResourceId = await paymentGateway.generateResourceId(
                "/api/query",
                aiAgent.address
            );

            const initialBalance = await usdrifToken.balanceOf(apiProvider.address);

            const subscriptionTx = await serviceRegistry.connect(aiAgent).subscribeToService(
                basicServiceId,
                basicResourceId
            );

            const subscriptionReceipt = await subscriptionTx.wait();

            // Verify payment was processed
            const finalBalance = await usdrifToken.balanceOf(apiProvider.address);
            expect(finalBalance.sub(initialBalance)).to.equal(API_PRICE);

            // Step 4: AI Agent requests access
            const paymentEvent = subscriptionReceipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            const paymentId = paymentGateway.interface.parseLog(paymentEvent).args[0];

            const accessTx = await accessControl.connect(aiAgent).requestAccess(
                basicResourceId,
                paymentId
            );

            const accessReceipt = await accessTx.wait();

            // Verify access was granted
            const accessGrantedEvent = accessReceipt.logs.find(log => {
                try {
                    const decoded = accessControl.interface.parseLog(log);
                    return decoded.name === "AccessGranted";
                } catch {
                    return false;
                }
            });

            expect(accessGrantedEvent).to.not.be.undefined;

            // Step 5: Verify AI Agent has active access
            const hasAccess = await accessControl.hasValidAccess(aiAgent.address, basicResourceId);
            expect(hasAccess).to.be.true;

            // Step 6: Verify subscription is active
            const hasSubscription = await serviceRegistry.hasActiveSubscription(
                aiAgent.address,
                basicServiceId
            );
            expect(hasSubscription).to.be.true;
        });

        it("Should handle premium service upgrade", async function () {
            // Start with basic service
            const basicResourceId = await paymentGateway.generateResourceId(
                "/api/query",
                aiAgent.address
            );

            await serviceRegistry.connect(aiAgent).subscribeToService(
                basicServiceId,
                basicResourceId
            );

            // Upgrade to premium service
            const premiumResourceId = await paymentGateway.generateResourceId(
                "/api/premium",
                aiAgent.address
            );

            const upgradeTx = await serviceRegistry.connect(aiAgent).subscribeToService(
                premiumServiceId,
                premiumResourceId
            );

            const upgradeReceipt = await upgradeTx.wait();

            // Verify both subscriptions are active
            expect(await serviceRegistry.hasActiveSubscription(aiAgent.address, basicServiceId)).to.be.true;
            expect(await serviceRegistry.hasActiveSubscription(aiAgent.address, premiumServiceId)).to.be.true;

            // Verify payment tracking
            const basicServiceInfo = await serviceRegistry.getServiceInfo(basicServiceId);
            const premiumServiceInfo = await serviceRegistry.getServiceInfo(premiumServiceId);

            expect(basicServiceInfo.totalPayments).to.equal(1);
            expect(basicServiceInfo.totalRevenue).to.equal(API_PRICE);
            expect(premiumServiceInfo.totalPayments).to.equal(1);
            expect(premiumServiceInfo.totalRevenue).to.equal(PREMIUM_PRICE);
        });

        it("Should handle multiple agents using same service", async function () {
            const basicResourceId1 = await paymentGateway.generateResourceId(
                "/api/query",
                aiAgent.address
            );

            const basicResourceId2 = await paymentGateway.generateResourceId(
                "/api/query",
                regularUser.address
            );

            // Both agents subscribe to the same service
            await serviceRegistry.connect(aiAgent).subscribeToService(
                basicServiceId,
                basicResourceId1
            );

            await serviceRegistry.connect(regularUser).subscribeToService(
                basicServiceId,
                basicResourceId2
            );

            // Verify both have active subscriptions
            expect(await serviceRegistry.hasActiveSubscription(aiAgent.address, basicServiceId)).to.be.true;
            expect(await serviceRegistry.hasActiveSubscription(regularUser.address, basicServiceId)).to.be.true;

            // Verify service statistics
            const serviceInfo = await serviceRegistry.getServiceInfo(basicServiceId);
            expect(serviceInfo.totalPayments).to.equal(2);
            expect(serviceInfo.totalRevenue).to.equal(API_PRICE.mul(2));
        });
    });

    describe("Service Lifecycle Management", function () {
        let serviceId;

        beforeEach(async function () {
            const tx = await serviceRegistry.connect(apiProvider).createService(
                "Lifecycle Test Service",
                "Service for testing lifecycle",
                API_PRICE,
                VALIDITY_DURATION,
                ["/api/lifecycle"]
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            serviceId = serviceRegistry.interface.parseLog(event).args[0];
        });

        it("Should handle service deactivation and reactivation", async function () {
            const resourceId = await paymentGateway.generateResourceId(
                "/api/lifecycle",
                aiAgent.address
            );

            // Subscribe while service is active
            await serviceRegistry.connect(aiAgent).subscribeToService(serviceId, resourceId);

            expect(await serviceRegistry.hasActiveSubscription(aiAgent.address, serviceId)).to.be.true;

            // Deactivate service
            await serviceRegistry.connect(apiProvider).updateService(serviceId, API_PRICE, false);

            // New subscriptions should fail
            const newResourceId = await paymentGateway.generateResourceId(
                "/api/lifecycle",
                regularUser.address
            );

            await expect(
                serviceRegistry.connect(regularUser).subscribeToService(serviceId, newResourceId)
            ).to.be.revertedWith("Service not active");

            // Existing subscription should still be valid (until expiry)
            expect(await serviceRegistry.hasActiveSubscription(aiAgent.address, serviceId)).to.be.true;

            // Reactivate service
            await serviceRegistry.connect(apiProvider).updateService(serviceId, API_PRICE, true);

            // New subscriptions should work again
            await expect(
                serviceRegistry.connect(regularUser).subscribeToService(serviceId, newResourceId)
            ).to.not.be.reverted;
        });

        it("Should handle price updates", async function () {
            const resourceId1 = await paymentGateway.generateResourceId(
                "/api/lifecycle",
                aiAgent.address
            );

            // Subscribe at original price
            await serviceRegistry.connect(aiAgent).subscribeToService(serviceId, resourceId1);

            // Update price
            const newPrice = ethers.utils.parseEther("1.0");
            await serviceRegistry.connect(apiProvider).updateService(serviceId, newPrice, true);

            // New subscription should use new price
            const resourceId2 = await paymentGateway.generateResourceId(
                "/api/lifecycle",
                regularUser.address
            );

            const initialBalance = await usdrifToken.balanceOf(apiProvider.address);

            await serviceRegistry.connect(regularUser).subscribeToService(serviceId, resourceId2);

            const finalBalance = await usdrifToken.balanceOf(apiProvider.address);
            expect(finalBalance.sub(initialBalance)).to.equal(newPrice);

            // Verify revenue tracking includes both prices
            const serviceInfo = await serviceRegistry.getServiceInfo(serviceId);
            expect(serviceInfo.totalRevenue).to.equal(API_PRICE.add(newPrice));
        });
    });

    describe("Access Control Integration", function () {
        let serviceId;

        beforeEach(async function () {
            const tx = await serviceRegistry.connect(apiProvider).createService(
                "Access Control Test",
                "Service for testing access control",
                API_PRICE,
                VALIDITY_DURATION,
                ["/api/access-test"]
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            serviceId = serviceRegistry.interface.parseLog(event).args[0];
        });

        it("Should integrate payment verification with access control", async function () {
            const resourceId = await paymentGateway.generateResourceId(
                "/api/access-test",
                aiAgent.address
            );

            // Make payment through service registry
            const subscriptionTx = await serviceRegistry.connect(aiAgent).subscribeToService(
                serviceId,
                resourceId
            );

            const subscriptionReceipt = await subscriptionTx.wait();

            // Extract payment ID
            const paymentEvent = subscriptionReceipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            const paymentId = paymentGateway.interface.parseLog(paymentEvent).args[0];

            // Verify payment directly
            const [valid, payer] = await paymentGateway.verifyPayment(
                paymentId,
                resourceId,
                VALIDITY_DURATION
            );

            expect(valid).to.be.true;
            expect(payer).to.equal(aiAgent.address);

            // Request access using payment proof
            await accessControl.connect(aiAgent).requestAccess(resourceId, paymentId);

            // Verify access is granted
            expect(await accessControl.hasValidAccess(aiAgent.address, resourceId)).to.be.true;
        });

        it("Should handle access expiry correctly", async function () {
            const resourceId = await paymentGateway.generateResourceId(
                "/api/access-test",
                aiAgent.address
            );

            // Subscribe and get access
            const subscriptionTx = await serviceRegistry.connect(aiAgent).subscribeToService(
                serviceId,
                resourceId
            );

            const subscriptionReceipt = await subscriptionTx.wait();

            const paymentEvent = subscriptionReceipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            const paymentId = paymentGateway.interface.parseLog(paymentEvent).args[0];

            await accessControl.connect(aiAgent).requestAccess(resourceId, paymentId);

            // Verify initial access
            expect(await accessControl.hasValidAccess(aiAgent.address, resourceId)).to.be.true;
            expect(await serviceRegistry.hasActiveSubscription(aiAgent.address, serviceId)).to.be.true;

            // Advance time beyond validity period
            await time.increase(VALIDITY_DURATION + 1);

            // Access should be expired
            expect(await accessControl.hasValidAccess(aiAgent.address, resourceId)).to.be.false;
            expect(await serviceRegistry.hasActiveSubscription(aiAgent.address, serviceId)).to.be.false;
        });
    });

    describe("Revenue and Analytics", function () {
        let basicServiceId;
        let premiumServiceId;

        beforeEach(async function () {
            // Create multiple services
            const basicTx = await serviceRegistry.connect(apiProvider).createService(
                "Analytics Basic",
                "Basic service for analytics",
                API_PRICE,
                VALIDITY_DURATION,
                ["/api/basic"]
            );

            const basicReceipt = await basicTx.wait();
            const basicEvent = basicReceipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            basicServiceId = serviceRegistry.interface.parseLog(basicEvent).args[0];

            const premiumTx = await serviceRegistry.connect(apiProvider).createService(
                "Analytics Premium",
                "Premium service for analytics",
                PREMIUM_PRICE,
                VALIDITY_DURATION,
                ["/api/premium"]
            );

            const premiumReceipt = await premiumTx.wait();
            const premiumEvent = premiumReceipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            premiumServiceId = serviceRegistry.interface.parseLog(premiumEvent).args[0];
        });

        it("Should track comprehensive revenue analytics", async function () {
            const users = [aiAgent, regularUser];
            const resources = ["resource1", "resource2"];

            // Get initial provider balance
            const initialProviderBalance = await usdrifToken.balanceOf(apiProvider.address);

            // Generate multiple subscriptions
            for (let i = 0; i < users.length; i++) {
                for (let j = 0; j < resources.length; j++) {
                    const resourceId = await paymentGateway.generateResourceId(
                        resources[j],
                        users[i].address
                    );

                    await serviceRegistry.connect(users[i]).subscribeToService(
                        basicServiceId,
                        resourceId
                    );

                    if (j === 0) { // Also subscribe to premium for first resource
                        const premiumResourceId = await paymentGateway.generateResourceId(
                            `premium-${resources[j]}`,
                            users[i].address
                        );

                        await serviceRegistry.connect(users[i]).subscribeToService(
                            premiumServiceId,
                            premiumResourceId
                        );
                    }
                }
            }

            // Verify analytics
            const basicServiceInfo = await serviceRegistry.getServiceInfo(basicServiceId);
            const premiumServiceInfo = await serviceRegistry.getServiceInfo(premiumServiceId);

            expect(basicServiceInfo.totalPayments).to.equal(4); // 2 users × 2 resources
            expect(basicServiceInfo.totalRevenue).to.equal(API_PRICE.mul(4));

            expect(premiumServiceInfo.totalPayments).to.equal(2); // 2 users × 1 resource each
            expect(premiumServiceInfo.totalRevenue).to.equal(PREMIUM_PRICE.mul(2));

            // Verify provider balance
            const expectedRevenue = API_PRICE.mul(4).add(PREMIUM_PRICE.mul(2));
            const finalProviderBalance = await usdrifToken.balanceOf(apiProvider.address);
            const actualRevenue = finalProviderBalance.sub(initialProviderBalance);
            expect(actualRevenue).to.equal(expectedRevenue);
        });
    });
});