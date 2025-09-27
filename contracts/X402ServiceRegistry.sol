// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./X402PaymentGateway.sol";

contract X402ServiceRegistry {
    X402PaymentGateway public immutable paymentGateway;

    struct Service {
        string name;
        string description;
        address owner;
        uint256 price;
        uint256 validityDuration;
        string[] endpoints;
        bool active;
        uint256 totalPayments;
        uint256 totalRevenue;
    }

    struct Subscription {
        address subscriber;
        bytes32 serviceId;
        uint256 expiresAt;
        bool active;
    }

    mapping(bytes32 => Service) public services;
    mapping(address => bytes32[]) public servicesByOwner;
    mapping(bytes32 => mapping(address => Subscription)) public subscriptions;

    bytes32[] public allServices;

    event ServiceCreated(
        bytes32 indexed serviceId,
        address indexed owner,
        string name,
        uint256 price
    );

    event ServiceUpdated(
        bytes32 indexed serviceId,
        uint256 newPrice,
        bool active
    );

    event SubscriptionCreated(
        bytes32 indexed serviceId,
        address indexed subscriber,
        uint256 expiresAt
    );

    constructor(address _paymentGateway) {
        paymentGateway = X402PaymentGateway(_paymentGateway);
    }

    function createService(
        string memory name,
        string memory description,
        uint256 price,
        uint256 validityDuration,
        string[] memory endpoints
    ) external returns (bytes32 serviceId) {
        serviceId = keccak256(abi.encodePacked(name, msg.sender, block.timestamp));

        services[serviceId] = Service({
            name: name,
            description: description,
            owner: msg.sender,
            price: price,
            validityDuration: validityDuration,
            endpoints: endpoints,
            active: true,
            totalPayments: 0,
            totalRevenue: 0
        });

        servicesByOwner[msg.sender].push(serviceId);
        allServices.push(serviceId);

        // Register with payment gateway
        paymentGateway.registerService(serviceId, msg.sender, price, validityDuration);

        emit ServiceCreated(serviceId, msg.sender, name, price);
        return serviceId;
    }

    function subscribeToService(
        bytes32 serviceId,
        bytes32 resourceId
    ) external returns (bytes32 paymentId) {
        Service storage service = services[serviceId];
        require(service.active, "Service not active");

        paymentId = paymentGateway.makePaymentFrom(msg.sender, serviceId, resourceId);

        subscriptions[serviceId][msg.sender] = Subscription({
            subscriber: msg.sender,
            serviceId: serviceId,
            expiresAt: block.timestamp + service.validityDuration,
            active: true
        });

        service.totalPayments++;
        service.totalRevenue += service.price;

        emit SubscriptionCreated(serviceId, msg.sender, block.timestamp + service.validityDuration);
        return paymentId;
    }

    function updateService(
        bytes32 serviceId,
        uint256 newPrice,
        bool active
    ) external {
        Service storage service = services[serviceId];
        require(service.owner == msg.sender, "Not service owner");

        service.price = newPrice;
        service.active = active;

        paymentGateway.updateServiceStatus(serviceId, active);
        paymentGateway.updateServicePrice(serviceId, newPrice);

        emit ServiceUpdated(serviceId, newPrice, active);
    }

    function addEndpoint(bytes32 serviceId, string memory endpoint) external {
        Service storage service = services[serviceId];
        require(service.owner == msg.sender, "Not service owner");

        service.endpoints.push(endpoint);
    }

    function hasActiveSubscription(
        address subscriber,
        bytes32 serviceId
    ) external view returns (bool) {
        Subscription memory sub = subscriptions[serviceId][subscriber];
        return sub.active && block.timestamp < sub.expiresAt;
    }

    function getServiceInfo(bytes32 serviceId) external view returns (
        string memory name,
        string memory description,
        address owner,
        uint256 price,
        uint256 validityDuration,
        bool active,
        uint256 totalPayments,
        uint256 totalRevenue
    ) {
        Service memory service = services[serviceId];
        return (
            service.name,
            service.description,
            service.owner,
            service.price,
            service.validityDuration,
            service.active,
            service.totalPayments,
            service.totalRevenue
        );
    }

    function getServiceEndpoints(bytes32 serviceId) external view returns (string[] memory) {
        return services[serviceId].endpoints;
    }

    function getServicesByOwner(address owner) external view returns (bytes32[] memory) {
        return servicesByOwner[owner];
    }

    function getAllServices() external view returns (bytes32[] memory) {
        return allServices;
    }

    function getSubscriptionInfo(
        bytes32 serviceId,
        address subscriber
    ) external view returns (
        address sub,
        uint256 expiresAt,
        bool active
    ) {
        Subscription memory subscription = subscriptions[serviceId][subscriber];
        return (subscription.subscriber, subscription.expiresAt, subscription.active);
    }
}