const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("X402ServiceRegistry", function () {
    let paymentGateway;
    let serviceRegistry;
    let usdrifToken;
    let owner;
    let serviceOwner1;
    let serviceOwner2;
    let user;
    let otherUser;

    const SERVICE_PRICE = ethers.utils.parseEther("1.0");
    const VALIDITY_DURATION = 3600; // 1 hour

    beforeEach(async function () {
        [owner, serviceOwner1, serviceOwner2, user, otherUser] = await ethers.getSigners();

        // Deploy MockUSDRIF
        const MockUSDRIF = await ethers.getContractFactory("MockUSDRIF");
        usdrifToken = await MockUSDRIF.deploy(1000000);
        await usdrifToken.deployed();

        // Deploy PaymentGateway
        const PaymentGateway = await ethers.getContractFactory("X402PaymentGateway");
        paymentGateway = await PaymentGateway.deploy(usdrifToken.address);
        await paymentGateway.deployed();

        // Deploy ServiceRegistry
        const ServiceRegistry = await ethers.getContractFactory("X402ServiceRegistry");
        serviceRegistry = await ServiceRegistry.deploy(paymentGateway.address);
        await serviceRegistry.deployed();

        // Authorize ServiceRegistry to call PaymentGateway
        await paymentGateway.authorizeService(serviceRegistry.address, true);

        // Setup tokens and approvals
        await usdrifToken.mint(user.address, ethers.utils.parseEther("1000"));
        await usdrifToken.mint(otherUser.address, ethers.utils.parseEther("1000"));

        await usdrifToken.connect(user).approve(
            paymentGateway.address,
            ethers.utils.parseEther("1000")
        );
        await usdrifToken.connect(otherUser).approve(
            paymentGateway.address,
            ethers.utils.parseEther("1000")
        );
    });

    describe("Deployment", function () {
        it("Should set the correct payment gateway address", async function () {
            expect(await serviceRegistry.paymentGateway()).to.equal(paymentGateway.address);
        });
    });

    describe("Service Creation", function () {
        it("Should create a service successfully", async function () {
            const serviceName = "AI API Service";
            const description = "Premium AI API access";
            const endpoints = ["/api/ai/premium", "/api/ai/advanced"];

            const tx = await serviceRegistry.connect(serviceOwner1).createService(
                serviceName,
                description,
                SERVICE_PRICE,
                VALIDITY_DURATION,
                endpoints
            );

            const receipt = await tx.wait();

            const serviceEvent = receipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            expect(serviceEvent).to.not.be.undefined;
            const decodedEvent = serviceRegistry.interface.parseLog(serviceEvent);
            const serviceId = decodedEvent.args[0];

            const serviceInfo = await serviceRegistry.getServiceInfo(serviceId);
            expect(serviceInfo.name).to.equal(serviceName);
            expect(serviceInfo.description).to.equal(description);
            expect(serviceInfo.owner).to.equal(serviceOwner1.address);
            expect(serviceInfo.price).to.equal(SERVICE_PRICE);
            expect(serviceInfo.validityDuration).to.equal(VALIDITY_DURATION);
            expect(serviceInfo.active).to.be.true;
            expect(serviceInfo.totalPayments).to.equal(0);
            expect(serviceInfo.totalRevenue).to.equal(0);

            const serviceEndpoints = await serviceRegistry.getServiceEndpoints(serviceId);
            expect(serviceEndpoints).to.deep.equal(endpoints);
        });

        it("Should add service to owner's list", async function () {
            const serviceName = "Test Service";
            const description = "Test Description";
            const endpoints = ["/api/test"];

            const tx = await serviceRegistry.connect(serviceOwner1).createService(
                serviceName,
                description,
                SERVICE_PRICE,
                VALIDITY_DURATION,
                endpoints
            );

            const receipt = await tx.wait();
            const serviceEvent = receipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            const serviceId = serviceRegistry.interface.parseLog(serviceEvent).args[0];

            const ownerServices = await serviceRegistry.getServicesByOwner(serviceOwner1.address);
            expect(ownerServices).to.include(serviceId);

            const allServices = await serviceRegistry.getAllServices();
            expect(allServices).to.include(serviceId);
        });

        it("Should register service with payment gateway", async function () {
            const serviceName = "Gateway Test Service";
            const description = "Test Description";
            const endpoints = ["/api/gateway"];

            const tx = await serviceRegistry.connect(serviceOwner1).createService(
                serviceName,
                description,
                SERVICE_PRICE,
                VALIDITY_DURATION,
                endpoints
            );

            const receipt = await tx.wait();
            const serviceEvent = receipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            const serviceId = serviceRegistry.interface.parseLog(serviceEvent).args[0];

            // Verify service is registered in payment gateway
            const gatewayServiceInfo = await paymentGateway.getServiceInfo(serviceId);
            expect(gatewayServiceInfo.recipient).to.equal(serviceOwner1.address);
            expect(gatewayServiceInfo.price).to.equal(SERVICE_PRICE);
            expect(gatewayServiceInfo.validityDuration).to.equal(VALIDITY_DURATION);
            expect(gatewayServiceInfo.active).to.be.true;
        });
    });

    describe("Service Management", function () {
        let serviceId;

        beforeEach(async function () {
            const tx = await serviceRegistry.connect(serviceOwner1).createService(
                "Test Service",
                "Test Description",
                SERVICE_PRICE,
                VALIDITY_DURATION,
                ["/api/test"]
            );

            const receipt = await tx.wait();
            const serviceEvent = receipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            serviceId = serviceRegistry.interface.parseLog(serviceEvent).args[0];
        });

        it("Should update service by owner", async function () {
            const newPrice = ethers.utils.parseEther("2.0");

            await expect(
                serviceRegistry.connect(serviceOwner1).updateService(serviceId, newPrice, false)
            ).to.emit(serviceRegistry, "ServiceUpdated")
                .withArgs(serviceId, newPrice, false);

            const serviceInfo = await serviceRegistry.getServiceInfo(serviceId);
            expect(serviceInfo.price).to.equal(newPrice);
            expect(serviceInfo.active).to.be.false;
        });

        it("Should reject update from non-owner", async function () {
            const newPrice = ethers.utils.parseEther("2.0");

            await expect(
                serviceRegistry.connect(user).updateService(serviceId, newPrice, false)
            ).to.be.revertedWith("Not service owner");
        });

        it("Should add endpoints", async function () {
            const newEndpoint = "/api/new-endpoint";

            await serviceRegistry.connect(serviceOwner1).addEndpoint(serviceId, newEndpoint);

            const endpoints = await serviceRegistry.getServiceEndpoints(serviceId);
            expect(endpoints).to.include(newEndpoint);
        });

        it("Should reject endpoint addition from non-owner", async function () {
            await expect(
                serviceRegistry.connect(user).addEndpoint(serviceId, "/api/unauthorized")
            ).to.be.revertedWith("Not service owner");
        });
    });

    describe("Subscriptions", function () {
        let serviceId;
        let resourceId;

        beforeEach(async function () {
            const tx = await serviceRegistry.connect(serviceOwner1).createService(
                "Subscription Service",
                "Test subscription service",
                SERVICE_PRICE,
                VALIDITY_DURATION,
                ["/api/subscription"]
            );

            const receipt = await tx.wait();
            const serviceEvent = receipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            serviceId = serviceRegistry.interface.parseLog(serviceEvent).args[0];
            resourceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-resource"));
        });

        it("Should create subscription successfully", async function () {
            const tx = await serviceRegistry.connect(user).subscribeToService(serviceId, resourceId);
            const receipt = await tx.wait();

            const subscriptionEvent = receipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "SubscriptionCreated";
                } catch {
                    return false;
                }
            });

            expect(subscriptionEvent).to.not.be.undefined;

            const hasActiveSubscription = await serviceRegistry.hasActiveSubscription(user.address, serviceId);
            expect(hasActiveSubscription).to.be.true;

            const subscriptionInfo = await serviceRegistry.getSubscriptionInfo(serviceId, user.address);
            expect(subscriptionInfo.sub).to.equal(user.address);
            expect(subscriptionInfo.active).to.be.true;
            expect(subscriptionInfo.expiresAt).to.be.gt(await time.latest());
        });

        it("Should update service statistics", async function () {
            await serviceRegistry.connect(user).subscribeToService(serviceId, resourceId);

            const serviceInfo = await serviceRegistry.getServiceInfo(serviceId);
            expect(serviceInfo.totalPayments).to.equal(1);
            expect(serviceInfo.totalRevenue).to.equal(SERVICE_PRICE);
        });

        it("Should handle multiple subscriptions", async function () {
            const resourceId2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-resource-2"));

            await serviceRegistry.connect(user).subscribeToService(serviceId, resourceId);
            await serviceRegistry.connect(otherUser).subscribeToService(serviceId, resourceId2);

            expect(await serviceRegistry.hasActiveSubscription(user.address, serviceId)).to.be.true;
            expect(await serviceRegistry.hasActiveSubscription(otherUser.address, serviceId)).to.be.true;

            const serviceInfo = await serviceRegistry.getServiceInfo(serviceId);
            expect(serviceInfo.totalPayments).to.equal(2);
            expect(serviceInfo.totalRevenue).to.equal(SERVICE_PRICE.mul(2));
        });

        it("Should fail subscription to inactive service", async function () {
            await serviceRegistry.connect(serviceOwner1).updateService(serviceId, SERVICE_PRICE, false);

            await expect(
                serviceRegistry.connect(user).subscribeToService(serviceId, resourceId)
            ).to.be.revertedWith("Service not active");
        });

        it("Should handle subscription expiry", async function () {
            await serviceRegistry.connect(user).subscribeToService(serviceId, resourceId);

            expect(await serviceRegistry.hasActiveSubscription(user.address, serviceId)).to.be.true;

            // Advance time beyond validity period
            await time.increase(VALIDITY_DURATION + 1);

            expect(await serviceRegistry.hasActiveSubscription(user.address, serviceId)).to.be.false;
        });
    });

    describe("Service Discovery", function () {
        let serviceId1;
        let serviceId2;

        beforeEach(async function () {
            const tx1 = await serviceRegistry.connect(serviceOwner1).createService(
                "Service 1",
                "First service",
                SERVICE_PRICE,
                VALIDITY_DURATION,
                ["/api/service1"]
            );

            const receipt1 = await tx1.wait();
            const serviceEvent1 = receipt1.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            serviceId1 = serviceRegistry.interface.parseLog(serviceEvent1).args[0];

            const tx2 = await serviceRegistry.connect(serviceOwner2).createService(
                "Service 2",
                "Second service",
                ethers.utils.parseEther("2.0"),
                7200, // 2 hours
                ["/api/service2"]
            );

            const receipt2 = await tx2.wait();
            const serviceEvent2 = receipt2.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            serviceId2 = serviceRegistry.interface.parseLog(serviceEvent2).args[0];
        });

        it("Should list all services", async function () {
            const allServices = await serviceRegistry.getAllServices();
            expect(allServices).to.include(serviceId1);
            expect(allServices).to.include(serviceId2);
            expect(allServices.length).to.equal(2);
        });

        it("Should list services by owner", async function () {
            const owner1Services = await serviceRegistry.getServicesByOwner(serviceOwner1.address);
            const owner2Services = await serviceRegistry.getServicesByOwner(serviceOwner2.address);

            expect(owner1Services).to.include(serviceId1);
            expect(owner1Services).to.not.include(serviceId2);
            expect(owner1Services.length).to.equal(1);

            expect(owner2Services).to.include(serviceId2);
            expect(owner2Services).to.not.include(serviceId1);
            expect(owner2Services.length).to.equal(1);
        });

        it("Should get correct service information", async function () {
            const service1Info = await serviceRegistry.getServiceInfo(serviceId1);
            const service2Info = await serviceRegistry.getServiceInfo(serviceId2);

            expect(service1Info.name).to.equal("Service 1");
            expect(service1Info.owner).to.equal(serviceOwner1.address);
            expect(service1Info.price).to.equal(SERVICE_PRICE);

            expect(service2Info.name).to.equal("Service 2");
            expect(service2Info.owner).to.equal(serviceOwner2.address);
            expect(service2Info.price).to.equal(ethers.utils.parseEther("2.0"));
        });

        it("Should get service endpoints", async function () {
            const service1Endpoints = await serviceRegistry.getServiceEndpoints(serviceId1);
            const service2Endpoints = await serviceRegistry.getServiceEndpoints(serviceId2);

            expect(service1Endpoints).to.deep.equal(["/api/service1"]);
            expect(service2Endpoints).to.deep.equal(["/api/service2"]);
        });
    });

    describe("Complex Scenarios", function () {
        let serviceId;

        beforeEach(async function () {
            const tx = await serviceRegistry.connect(serviceOwner1).createService(
                "Premium Service",
                "Premium service with analytics",
                SERVICE_PRICE,
                VALIDITY_DURATION,
                ["/api/premium"]
            );

            const receipt = await tx.wait();
            const serviceEvent = receipt.logs.find(log => {
                try {
                    const decoded = serviceRegistry.interface.parseLog(log);
                    return decoded.name === "ServiceCreated";
                } catch {
                    return false;
                }
            });

            serviceId = serviceRegistry.interface.parseLog(serviceEvent).args[0];
        });

        it("Should handle service reactivation", async function () {
            // Deactivate service
            await serviceRegistry.connect(serviceOwner1).updateService(serviceId, SERVICE_PRICE, false);

            // Try to subscribe (should fail)
            const resourceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-resource"));
            await expect(
                serviceRegistry.connect(user).subscribeToService(serviceId, resourceId)
            ).to.be.revertedWith("Service not active");

            // Reactivate service
            await serviceRegistry.connect(serviceOwner1).updateService(serviceId, SERVICE_PRICE, true);

            // Subscribe should now work
            await expect(
                serviceRegistry.connect(user).subscribeToService(serviceId, resourceId)
            ).to.not.be.reverted;

            expect(await serviceRegistry.hasActiveSubscription(user.address, serviceId)).to.be.true;
        });

        it("Should track revenue across multiple subscriptions", async function () {
            const resourceId1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("resource-1"));
            const resourceId2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("resource-2"));

            await serviceRegistry.connect(user).subscribeToService(serviceId, resourceId1);
            await serviceRegistry.connect(otherUser).subscribeToService(serviceId, resourceId2);

            // Update price and add another subscription
            const newPrice = ethers.utils.parseEther("1.5");
            await serviceRegistry.connect(serviceOwner1).updateService(serviceId, newPrice, true);

            // Need to approve more tokens for the higher price
            await usdrifToken.connect(user).approve(
                paymentGateway.address,
                ethers.utils.parseEther("1000")
            );

            const resourceId3 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("resource-3"));
            await serviceRegistry.connect(user).subscribeToService(serviceId, resourceId3);

            const serviceInfo = await serviceRegistry.getServiceInfo(serviceId);
            expect(serviceInfo.totalPayments).to.equal(3);
            expect(serviceInfo.totalRevenue).to.equal(SERVICE_PRICE.mul(2).add(newPrice));
        });
    });
});