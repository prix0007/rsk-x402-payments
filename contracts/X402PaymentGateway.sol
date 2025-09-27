// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IERC20.sol";

contract X402PaymentGateway {
    IERC20 public immutable usdrifToken;

    struct PaymentProof {
        address payer;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        bytes32 resourceId;
        bool verified;
    }

    struct ServiceConfig {
        address recipient;
        uint256 price;
        uint256 validityDuration;
        bool active;
    }

    mapping(bytes32 => PaymentProof) public payments;
    mapping(bytes32 => ServiceConfig) public services;
    mapping(address => bool) public authorizedServices;

    address public owner;
    uint256 public constant MIN_PAYMENT = 1e15; // 0.001 USDRIF

    event PaymentMade(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        bytes32 resourceId
    );

    event ServiceRegistered(
        bytes32 indexed serviceId,
        address indexed recipient,
        uint256 price
    );

    event AccessGranted(
        bytes32 indexed paymentId,
        address indexed payer,
        bytes32 indexed resourceId
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorizedService() {
        require(authorizedServices[msg.sender], "Not authorized service");
        _;
    }

    constructor(address _usdrifToken) {
        usdrifToken = IERC20(_usdrifToken);
        owner = msg.sender;
    }

    function registerService(
        bytes32 serviceId,
        address recipient,
        uint256 price,
        uint256 validityDuration
    ) external {
        require(price >= MIN_PAYMENT, "Price too low");
        require(recipient != address(0), "Invalid recipient");

        services[serviceId] = ServiceConfig({
            recipient: recipient,
            price: price,
            validityDuration: validityDuration,
            active: true
        });

        emit ServiceRegistered(serviceId, recipient, price);
    }

    function makePayment(
        bytes32 serviceId,
        bytes32 resourceId
    ) external returns (bytes32 paymentId) {
        return makePaymentFrom(msg.sender, serviceId, resourceId);
    }

    function makePaymentFrom(
        address payer,
        bytes32 serviceId,
        bytes32 resourceId
    ) public returns (bytes32 paymentId) {
        ServiceConfig memory service = services[serviceId];
        require(service.active, "Service not active");

        paymentId = keccak256(
            abi.encodePacked(
                payer,
                serviceId,
                resourceId,
                block.timestamp,
                block.number
            )
        );

        require(!payments[paymentId].verified, "Payment already exists");

        bool success = usdrifToken.transferFrom(
            payer,
            service.recipient,
            service.price
        );
        require(success, "Payment failed");

        payments[paymentId] = PaymentProof({
            payer: payer,
            recipient: service.recipient,
            amount: service.price,
            timestamp: block.timestamp,
            resourceId: resourceId,
            verified: true
        });

        emit PaymentMade(paymentId, payer, service.recipient, service.price, resourceId);
        emit AccessGranted(paymentId, payer, resourceId);

        return paymentId;
    }

    function verifyPayment(
        bytes32 paymentId,
        bytes32 resourceId,
        uint256 validityDuration
    ) external view returns (bool valid, address payer) {
        PaymentProof memory payment = payments[paymentId];

        if (!payment.verified) {
            return (false, address(0));
        }

        if (payment.resourceId != resourceId) {
            return (false, address(0));
        }

        if (validityDuration == 0 ||
            block.timestamp > payment.timestamp + validityDuration) {
            return (false, address(0));
        }

        return (true, payment.payer);
    }

    function verifyPaymentForService(
        bytes32 paymentId,
        bytes32 serviceId
    ) external view returns (bool valid, address payer) {
        ServiceConfig memory service = services[serviceId];
        PaymentProof memory payment = payments[paymentId];

        return this.verifyPayment(paymentId, payment.resourceId, service.validityDuration);
    }

    function generateResourceId(
        string memory resource,
        address requester
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(resource, requester));
    }

    function generateServiceId(string memory serviceName) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(serviceName));
    }

    function authorizeService(address service, bool authorized) external onlyOwner {
        authorizedServices[service] = authorized;
    }

    function updateServiceStatus(bytes32 serviceId, bool active) external {
        ServiceConfig storage service = services[serviceId];
        require(
            service.recipient == msg.sender ||
            msg.sender == owner ||
            authorizedServices[msg.sender],
            "Not authorized"
        );
        service.active = active;
    }

    function updateServicePrice(bytes32 serviceId, uint256 newPrice) external {
        ServiceConfig storage service = services[serviceId];
        require(
            service.recipient == msg.sender ||
            msg.sender == owner ||
            authorizedServices[msg.sender],
            "Not authorized"
        );
        require(newPrice >= MIN_PAYMENT, "Price too low");
        service.price = newPrice;
    }

    function getPaymentInfo(bytes32 paymentId) external view returns (
        address payer,
        address recipient,
        uint256 amount,
        uint256 timestamp,
        bytes32 resourceId,
        bool verified
    ) {
        PaymentProof memory payment = payments[paymentId];
        return (
            payment.payer,
            payment.recipient,
            payment.amount,
            payment.timestamp,
            payment.resourceId,
            payment.verified
        );
    }

    function getServiceInfo(bytes32 serviceId) external view returns (
        address recipient,
        uint256 price,
        uint256 validityDuration,
        bool active
    ) {
        ServiceConfig memory service = services[serviceId];
        return (service.recipient, service.price, service.validityDuration, service.active);
    }
}