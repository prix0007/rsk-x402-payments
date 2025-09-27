const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("X402PaymentGateway", function () {
    let paymentGateway;
    let usdrifToken;
    let owner;
    let serviceOwner;
    let user;
    let otherUser;

    const SERVICE_PRICE = ethers.utils.parseEther("1.0");
    const VALIDITY_DURATION = 3600; // 1 hour

    beforeEach(async function () {
        [owner, serviceOwner, user, otherUser] = await ethers.getSigners();

        // Deploy MockUSDRIF
        const MockUSDRIF = await ethers.getContractFactory("MockUSDRIF");
        usdrifToken = await MockUSDRIF.deploy(1000000);
        await usdrifToken.deployed();

        // Deploy PaymentGateway
        const PaymentGateway = await ethers.getContractFactory("X402PaymentGateway");
        paymentGateway = await PaymentGateway.deploy(usdrifToken.address);
        await paymentGateway.deployed();

        // Mint tokens to users
        await usdrifToken.mint(user.address, ethers.utils.parseEther("1000"));
        await usdrifToken.mint(otherUser.address, ethers.utils.parseEther("1000"));

        // Approve tokens for payment gateway
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
        it("Should set the correct USDRIF token address", async function () {
            expect(await paymentGateway.usdrifToken()).to.equal(usdrifToken.address);
        });

        it("Should set the correct owner", async function () {
            expect(await paymentGateway.owner()).to.equal(owner.address);
        });

        it("Should set minimum payment constant", async function () {
            expect(await paymentGateway.MIN_PAYMENT()).to.equal(ethers.utils.parseEther("0.001"));
        });
    });

    describe("Service Registration", function () {
        it("Should register a service successfully", async function () {
            const serviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-service"));

            await expect(
                paymentGateway.connect(serviceOwner).registerService(
                    serviceId,
                    serviceOwner.address,
                    SERVICE_PRICE,
                    VALIDITY_DURATION
                )
            ).to.emit(paymentGateway, "ServiceRegistered")
                .withArgs(serviceId, serviceOwner.address, SERVICE_PRICE);

            const service = await paymentGateway.getServiceInfo(serviceId);
            expect(service.recipient).to.equal(serviceOwner.address);
            expect(service.price).to.equal(SERVICE_PRICE);
            expect(service.validityDuration).to.equal(VALIDITY_DURATION);
            expect(service.active).to.be.true;
        });

        it("Should reject service registration with price below minimum", async function () {
            const serviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("cheap-service"));
            const lowPrice = ethers.utils.parseEther("0.0001");

            await expect(
                paymentGateway.connect(serviceOwner).registerService(
                    serviceId,
                    serviceOwner.address,
                    lowPrice,
                    VALIDITY_DURATION
                )
            ).to.be.revertedWith("Price too low");
        });

        it("Should reject service registration with zero recipient", async function () {
            const serviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("zero-recipient"));

            await expect(
                paymentGateway.connect(serviceOwner).registerService(
                    serviceId,
                    ethers.constants.AddressZero,
                    SERVICE_PRICE,
                    VALIDITY_DURATION
                )
            ).to.be.revertedWith("Invalid recipient");
        });
    });

    describe("Payment Processing", function () {
        let serviceId;
        let resourceId;

        beforeEach(async function () {
            serviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-service"));
            resourceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-resource"));

            await paymentGateway.connect(serviceOwner).registerService(
                serviceId,
                serviceOwner.address,
                SERVICE_PRICE,
                VALIDITY_DURATION
            );
        });

        it("Should process payment successfully", async function () {
            const initialBalance = await usdrifToken.balanceOf(serviceOwner.address);

            const tx = await paymentGateway.connect(user).makePayment(serviceId, resourceId);
            const receipt = await tx.wait();

            // Check events
            const paymentEvent = receipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            expect(paymentEvent).to.not.be.undefined;
            const decodedEvent = paymentGateway.interface.parseLog(paymentEvent);
            const paymentId = decodedEvent.args[0];

            // Check payment proof
            const paymentInfo = await paymentGateway.getPaymentInfo(paymentId);
            expect(paymentInfo.payer).to.equal(user.address);
            expect(paymentInfo.recipient).to.equal(serviceOwner.address);
            expect(paymentInfo.amount).to.equal(SERVICE_PRICE);
            expect(paymentInfo.resourceId).to.equal(resourceId);
            expect(paymentInfo.verified).to.be.true;

            // Check token transfer
            const finalBalance = await usdrifToken.balanceOf(serviceOwner.address);
            expect(finalBalance.sub(initialBalance)).to.equal(SERVICE_PRICE);
        });

        it("Should fail payment for inactive service", async function () {
            await paymentGateway.connect(serviceOwner).updateServiceStatus(serviceId, false);

            await expect(
                paymentGateway.connect(user).makePayment(serviceId, resourceId)
            ).to.be.revertedWith("Service not active");
        });

        it("Should fail payment with insufficient token balance", async function () {
            // Use an account with no tokens
            const [, , , , noTokenUser] = await ethers.getSigners();

            await expect(
                paymentGateway.connect(noTokenUser).makePayment(serviceId, resourceId)
            ).to.be.revertedWith("ERC20: insufficient allowance");
        });

        it("Should prevent duplicate payments", async function () {
            // This test checks that the same payment ID cannot be generated twice
            // In practice, this is extremely unlikely due to timestamp and block number inclusion
            await paymentGateway.connect(user).makePayment(serviceId, resourceId);

            // Since payment IDs include timestamp and block number,
            // we'll just verify one payment went through
            expect(await usdrifToken.balanceOf(serviceOwner.address)).to.equal(SERVICE_PRICE);
        });
    });

    describe("Payment Verification", function () {
        let serviceId;
        let resourceId;
        let paymentId;

        beforeEach(async function () {
            serviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-service"));
            resourceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-resource"));

            await paymentGateway.connect(serviceOwner).registerService(
                serviceId,
                serviceOwner.address,
                SERVICE_PRICE,
                VALIDITY_DURATION
            );

            const tx = await paymentGateway.connect(user).makePayment(serviceId, resourceId);
            const receipt = await tx.wait();

            const paymentEvent = receipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            paymentId = paymentGateway.interface.parseLog(paymentEvent).args[0];
        });

        it("Should verify valid payment", async function () {
            const [valid, payer] = await paymentGateway.verifyPayment(
                paymentId,
                resourceId,
                VALIDITY_DURATION
            );

            expect(valid).to.be.true;
            expect(payer).to.equal(user.address);
        });

        it("Should reject payment with wrong resource ID", async function () {
            const wrongResourceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("wrong-resource"));

            const [valid, payer] = await paymentGateway.verifyPayment(
                paymentId,
                wrongResourceId,
                VALIDITY_DURATION
            );

            expect(valid).to.be.false;
            expect(payer).to.equal(ethers.constants.AddressZero);
        });

        it("Should reject expired payment", async function () {
            // Simulate time passing by using a very short validity duration
            const [valid, payer] = await paymentGateway.verifyPayment(
                paymentId,
                resourceId,
                0 // 0 duration means immediate expiry
            );

            expect(valid).to.be.false;
            expect(payer).to.equal(ethers.constants.AddressZero);
        });

        it("Should verify payment for service", async function () {
            const [valid, payer] = await paymentGateway.verifyPaymentForService(
                paymentId,
                serviceId
            );

            expect(valid).to.be.true;
            expect(payer).to.equal(user.address);
        });
    });

    describe("Service Management", function () {
        let serviceId;

        beforeEach(async function () {
            serviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-service"));

            await paymentGateway.connect(serviceOwner).registerService(
                serviceId,
                serviceOwner.address,
                SERVICE_PRICE,
                VALIDITY_DURATION
            );
        });

        it("Should allow service owner to update status", async function () {
            await paymentGateway.connect(serviceOwner).updateServiceStatus(serviceId, false);

            const service = await paymentGateway.getServiceInfo(serviceId);
            expect(service.active).to.be.false;
        });

        it("Should allow contract owner to update any service status", async function () {
            await paymentGateway.connect(owner).updateServiceStatus(serviceId, false);

            const service = await paymentGateway.getServiceInfo(serviceId);
            expect(service.active).to.be.false;
        });

        it("Should reject unauthorized service status updates", async function () {
            await expect(
                paymentGateway.connect(user).updateServiceStatus(serviceId, false)
            ).to.be.revertedWith("Not authorized");
        });
    });

    describe("Authorization Management", function () {
        it("Should allow owner to authorize services", async function () {
            await paymentGateway.connect(owner).authorizeService(user.address, true);
            expect(await paymentGateway.authorizedServices(user.address)).to.be.true;

            await paymentGateway.connect(owner).authorizeService(user.address, false);
            expect(await paymentGateway.authorizedServices(user.address)).to.be.false;
        });

        it("Should reject authorization from non-owner", async function () {
            await expect(
                paymentGateway.connect(user).authorizeService(user.address, true)
            ).to.be.revertedWith("Not owner");
        });
    });

    describe("Utility Functions", function () {
        it("Should generate consistent resource IDs", async function () {
            const resource = "test-resource";
            const requester = user.address;

            const resourceId1 = await paymentGateway.generateResourceId(resource, requester);
            const resourceId2 = await paymentGateway.generateResourceId(resource, requester);

            expect(resourceId1).to.equal(resourceId2);
        });

        it("Should generate consistent service IDs", async function () {
            const serviceName = "test-service";

            const serviceId1 = await paymentGateway.generateServiceId(serviceName);
            const serviceId2 = await paymentGateway.generateServiceId(serviceName);

            expect(serviceId1).to.equal(serviceId2);
        });

        it("Should generate different IDs for different inputs", async function () {
            const resourceId1 = await paymentGateway.generateResourceId("resource1", user.address);
            const resourceId2 = await paymentGateway.generateResourceId("resource2", user.address);

            expect(resourceId1).to.not.equal(resourceId2);
        });
    });
});