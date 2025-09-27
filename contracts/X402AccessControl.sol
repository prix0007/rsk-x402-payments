// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./X402PaymentGateway.sol";

contract X402AccessControl {
    X402PaymentGateway public immutable paymentGateway;

    struct AccessRequest {
        bytes32 resourceId;
        address requester;
        uint256 timestamp;
        bool granted;
    }

    mapping(bytes32 => AccessRequest) public accessRequests;
    mapping(bytes32 => mapping(address => uint256)) public lastAccess;

    event AccessRequested(
        bytes32 indexed requestId,
        address indexed requester,
        bytes32 indexed resourceId
    );

    event AccessGranted(
        bytes32 indexed requestId,
        address indexed requester,
        bytes32 indexed resourceId,
        bytes32 paymentId
    );

    event AccessDenied(
        bytes32 indexed requestId,
        address indexed requester,
        bytes32 indexed resourceId,
        string reason
    );

    constructor(address _paymentGateway) {
        paymentGateway = X402PaymentGateway(_paymentGateway);
    }

    function requestAccess(
        bytes32 resourceId,
        bytes32 paymentId
    ) external returns (bytes32 requestId) {
        requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                resourceId,
                block.timestamp,
                block.number
            )
        );

        accessRequests[requestId] = AccessRequest({
            resourceId: resourceId,
            requester: msg.sender,
            timestamp: block.timestamp,
            granted: false
        });

        emit AccessRequested(requestId, msg.sender, resourceId);

        if (paymentId != bytes32(0)) {
            _verifyAndGrantAccess(requestId, paymentId, resourceId);
        }

        return requestId;
    }

    function grantAccessWithPayment(
        bytes32 requestId,
        bytes32 paymentId
    ) external {
        AccessRequest storage request = accessRequests[requestId];
        require(request.requester == msg.sender, "Not your request");
        require(!request.granted, "Already granted");

        _verifyAndGrantAccess(requestId, paymentId, request.resourceId);
    }

    function _verifyAndGrantAccess(
        bytes32 requestId,
        bytes32 paymentId,
        bytes32 resourceId
    ) internal {
        (bool valid, address payer) = paymentGateway.verifyPayment(
            paymentId,
            resourceId,
            3600 // 1 hour validity
        );

        if (valid && payer == msg.sender) {
            accessRequests[requestId].granted = true;
            lastAccess[resourceId][msg.sender] = block.timestamp;

            emit AccessGranted(requestId, msg.sender, resourceId, paymentId);
        } else {
            emit AccessDenied(requestId, msg.sender, resourceId, "Invalid payment");
        }
    }

    function checkAccess(
        address user,
        bytes32 resourceId,
        uint256 validityPeriod
    ) external view returns (bool hasAccess) {
        uint256 lastAccessTime = lastAccess[resourceId][user];

        if (lastAccessTime == 0) {
            return false;
        }

        return block.timestamp <= lastAccessTime + validityPeriod;
    }

    function hasValidAccess(
        address user,
        bytes32 resourceId
    ) external view returns (bool) {
        return this.checkAccess(user, resourceId, 3600); // Default 1 hour
    }
}