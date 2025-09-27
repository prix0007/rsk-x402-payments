const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("X402AccessControl", function () {
    let paymentGateway;
    let accessControl;
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

        // Deploy AccessControl
        const AccessControl = await ethers.getContractFactory("X402AccessControl");
        accessControl = await AccessControl.deploy(paymentGateway.address);
        await accessControl.deployed();

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
            expect(await accessControl.paymentGateway()).to.equal(paymentGateway.address);
        });
    });

    describe("Access Requests", function () {
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

        it("Should create access request without payment", async function () {
            const tx = await accessControl.connect(user).requestAccess(resourceId, ethers.constants.HashZero);
            const receipt = await tx.wait();

            const accessEvent = receipt.logs.find(log => {
                try {
                    const decoded = accessControl.interface.parseLog(log);
                    return decoded.name === "AccessRequested";
                } catch {
                    return false;
                }
            });

            expect(accessEvent).to.not.be.undefined;
            const decodedEvent = accessControl.interface.parseLog(accessEvent);
            const requestId = decodedEvent.args[0];

            const request = await accessControl.accessRequests(requestId);
            expect(request.resourceId).to.equal(resourceId);
            expect(request.requester).to.equal(user.address);
            expect(request.granted).to.be.false;
        });

        it("Should create access request with payment and auto-grant", async function () {
            // First make payment
            const paymentTx = await paymentGateway.connect(user).makePayment(serviceId, resourceId);
            const paymentReceipt = await paymentTx.wait();

            const paymentEvent = paymentReceipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            const paymentId = paymentGateway.interface.parseLog(paymentEvent).args[0];

            // Request access with payment
            const tx = await accessControl.connect(user).requestAccess(resourceId, paymentId);
            const receipt = await tx.wait();

            // Should emit both AccessRequested and AccessGranted
            const accessGrantedEvent = receipt.logs.find(log => {
                try {
                    const decoded = accessControl.interface.parseLog(log);
                    return decoded.name === "AccessGranted";
                } catch {
                    return false;
                }
            });

            expect(accessGrantedEvent).to.not.be.undefined;

            const requestEvent = receipt.logs.find(log => {
                try {
                    const decoded = accessControl.interface.parseLog(log);
                    return decoded.name === "AccessRequested";
                } catch {
                    return false;
                }
            });

            const requestId = accessControl.interface.parseLog(requestEvent).args[0];
            const request = await accessControl.accessRequests(requestId);
            expect(request.granted).to.be.true;
        });

        it("Should track last access time", async function () {
            // Make payment and request access
            const paymentTx = await paymentGateway.connect(user).makePayment(serviceId, resourceId);
            const paymentReceipt = await paymentTx.wait();

            const paymentEvent = paymentReceipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            const paymentId = paymentGateway.interface.parseLog(paymentEvent).args[0];

            await accessControl.connect(user).requestAccess(resourceId, paymentId);

            const lastAccess = await accessControl.lastAccess(resourceId, user.address);
            expect(lastAccess).to.be.gt(0);
        });
    });

    describe("Manual Payment Granting", function () {
        let serviceId;
        let resourceId;
        let requestId;

        beforeEach(async function () {
            serviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-service"));
            resourceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-resource"));

            await paymentGateway.connect(serviceOwner).registerService(
                serviceId,
                serviceOwner.address,
                SERVICE_PRICE,
                VALIDITY_DURATION
            );

            const tx = await accessControl.connect(user).requestAccess(resourceId, ethers.constants.HashZero);
            const receipt = await tx.wait();

            const accessEvent = receipt.logs.find(log => {
                try {
                    const decoded = accessControl.interface.parseLog(log);
                    return decoded.name === "AccessRequested";
                } catch {
                    return false;
                }
            });

            requestId = accessControl.interface.parseLog(accessEvent).args[0];
        });

        it("Should grant access with valid payment", async function () {
            // Make payment
            const paymentTx = await paymentGateway.connect(user).makePayment(serviceId, resourceId);
            const paymentReceipt = await paymentTx.wait();

            const paymentEvent = paymentReceipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            const paymentId = paymentGateway.interface.parseLog(paymentEvent).args[0];

            // Grant access manually
            const tx = await accessControl.connect(user).grantAccessWithPayment(requestId, paymentId);
            const receipt = await tx.wait();

            const accessGrantedEvent = receipt.logs.find(log => {
                try {
                    const decoded = accessControl.interface.parseLog(log);
                    return decoded.name === "AccessGranted";
                } catch {
                    return false;
                }
            });

            expect(accessGrantedEvent).to.not.be.undefined;

            const request = await accessControl.accessRequests(requestId);
            expect(request.granted).to.be.true;
        });

        it("Should deny access with invalid payment", async function () {
            const fakePaymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("fake"));

            const tx = await accessControl.connect(user).grantAccessWithPayment(requestId, fakePaymentId);
            const receipt = await tx.wait();

            const accessDeniedEvent = receipt.logs.find(log => {
                try {
                    const decoded = accessControl.interface.parseLog(log);
                    return decoded.name === "AccessDenied";
                } catch {
                    return false;
                }
            });

            expect(accessDeniedEvent).to.not.be.undefined;

            const request = await accessControl.accessRequests(requestId);
            expect(request.granted).to.be.false;
        });

        it("Should reject grant from wrong user", async function () {
            const paymentTx = await paymentGateway.connect(user).makePayment(serviceId, resourceId);
            const paymentReceipt = await paymentTx.wait();

            const paymentEvent = paymentReceipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            const paymentId = paymentGateway.interface.parseLog(paymentEvent).args[0];

            await expect(
                accessControl.connect(otherUser).grantAccessWithPayment(requestId, paymentId)
            ).to.be.revertedWith("Not your request");
        });

        it("Should reject duplicate grant", async function () {
            const paymentTx = await paymentGateway.connect(user).makePayment(serviceId, resourceId);
            const paymentReceipt = await paymentTx.wait();

            const paymentEvent = paymentReceipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            const paymentId = paymentGateway.interface.parseLog(paymentEvent).args[0];

            await accessControl.connect(user).grantAccessWithPayment(requestId, paymentId);

            await expect(
                accessControl.connect(user).grantAccessWithPayment(requestId, paymentId)
            ).to.be.revertedWith("Already granted");
        });
    });

    describe("Access Verification", function () {
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

            // Make payment and grant access
            const paymentTx = await paymentGateway.connect(user).makePayment(serviceId, resourceId);
            const paymentReceipt = await paymentTx.wait();

            const paymentEvent = paymentReceipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });

            const paymentId = paymentGateway.interface.parseLog(paymentEvent).args[0];
            await accessControl.connect(user).requestAccess(resourceId, paymentId);
        });

        it("Should verify valid access", async function () {
            const hasAccess = await accessControl.hasValidAccess(user.address, resourceId);
            expect(hasAccess).to.be.true;
        });

        it("Should check access with custom validity period", async function () {
            const hasAccess = await accessControl.checkAccess(user.address, resourceId, 7200); // 2 hours
            expect(hasAccess).to.be.true;
        });

        it("Should deny access for user without payment", async function () {
            const hasAccess = await accessControl.hasValidAccess(otherUser.address, resourceId);
            expect(hasAccess).to.be.false;
        });

        it("Should deny access for wrong resource", async function () {
            const wrongResourceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("wrong-resource"));
            const hasAccess = await accessControl.hasValidAccess(user.address, wrongResourceId);
            expect(hasAccess).to.be.false;
        });

        it("Should deny expired access", async function () {
            // Advance time beyond validity period
            await time.increase(3700); // 1 hour + 100 seconds

            const hasAccess = await accessControl.hasValidAccess(user.address, resourceId);
            expect(hasAccess).to.be.false;
        });

        it("Should still show access with longer validity period", async function () {
            // Advance time beyond default validity but within custom period
            await time.increase(3700); // 1 hour + 100 seconds

            const hasAccess = await accessControl.checkAccess(user.address, resourceId, 7200); // 2 hours
            expect(hasAccess).to.be.true;
        });
    });

    describe("Multiple Access Patterns", function () {
        let serviceId;
        let resourceId1;
        let resourceId2;

        beforeEach(async function () {
            serviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-service"));
            resourceId1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("resource-1"));
            resourceId2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("resource-2"));

            await paymentGateway.connect(serviceOwner).registerService(
                serviceId,
                serviceOwner.address,
                SERVICE_PRICE,
                VALIDITY_DURATION
            );
        });

        it("Should handle multiple resource access for same user", async function () {
            // Payment for resource 1
            const payment1Tx = await paymentGateway.connect(user).makePayment(serviceId, resourceId1);
            const payment1Receipt = await payment1Tx.wait();
            const payment1Event = payment1Receipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });
            const paymentId1 = paymentGateway.interface.parseLog(payment1Event).args[0];

            // Payment for resource 2
            const payment2Tx = await paymentGateway.connect(user).makePayment(serviceId, resourceId2);
            const payment2Receipt = await payment2Tx.wait();
            const payment2Event = payment2Receipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });
            const paymentId2 = paymentGateway.interface.parseLog(payment2Event).args[0];

            // Grant access to both resources
            await accessControl.connect(user).requestAccess(resourceId1, paymentId1);
            await accessControl.connect(user).requestAccess(resourceId2, paymentId2);

            // Verify access to both
            expect(await accessControl.hasValidAccess(user.address, resourceId1)).to.be.true;
            expect(await accessControl.hasValidAccess(user.address, resourceId2)).to.be.true;
        });

        it("Should handle independent access expiry", async function () {
            // Payment for resource 1
            const payment1Tx = await paymentGateway.connect(user).makePayment(serviceId, resourceId1);
            const payment1Receipt = await payment1Tx.wait();
            const payment1Event = payment1Receipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });
            const paymentId1 = paymentGateway.interface.parseLog(payment1Event).args[0];

            await accessControl.connect(user).requestAccess(resourceId1, paymentId1);

            // Advance time
            await time.increase(1800); // 30 minutes

            // Payment for resource 2 (after some time)
            const payment2Tx = await paymentGateway.connect(user).makePayment(serviceId, resourceId2);
            const payment2Receipt = await payment2Tx.wait();
            const payment2Event = payment2Receipt.logs.find(log => {
                try {
                    const decoded = paymentGateway.interface.parseLog(log);
                    return decoded.name === "PaymentMade";
                } catch {
                    return false;
                }
            });
            const paymentId2 = paymentGateway.interface.parseLog(payment2Event).args[0];

            await accessControl.connect(user).requestAccess(resourceId2, paymentId2);

            // Advance time to expire resource 1 but not resource 2
            await time.increase(2000); // Total: 50 minutes for resource 1, 20 minutes for resource 2

            expect(await accessControl.hasValidAccess(user.address, resourceId1)).to.be.false;
            expect(await accessControl.hasValidAccess(user.address, resourceId2)).to.be.true;
        });
    });
});