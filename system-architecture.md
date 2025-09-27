# X402 Payment System Architecture

## System Overview Diagram

```mermaid
graph TB
    %% External Actors
    User[👤 User/AI Agent]
    ServiceOwner[👨‍💼 Service Owner]
    Owner[🔑 Contract Owner]

    %% Core Contracts
    PG[🏦 X402PaymentGateway<br/>Core Payment Engine]
    SR[📋 X402ServiceRegistry<br/>Service Marketplace]
    AC[🔐 X402AccessControl<br/>Resource Access]
    USDRIF[💰 MockUSDRIF<br/>Payment Token]

    %% User Interactions
    User -->|1. Discover Services| SR
    User -->|2. Subscribe & Pay| SR
    User -->|3. Request Access| AC
    User -->|4. Use Resources| AC

    %% Service Owner Interactions
    ServiceOwner -->|Create Services| SR
    ServiceOwner -->|Update Pricing| SR
    ServiceOwner -->|Manage Status| SR

    %% Contract Owner Interactions
    Owner -->|Authorize Contracts| PG
    Owner -->|Mint Test Tokens| USDRIF

    %% Inter-Contract Communications
    SR -->|Register Service| PG
    SR -->|Process Payment| PG
    SR -->|Update Price/Status| PG
    AC -->|Verify Payment| PG
    PG -->|Transfer USDRIF| USDRIF

    %% Data Flow
    PG -.->|Payment Proofs| SR
    PG -.->|Access Verification| AC
    SR -.->|Service Analytics| ServiceOwner
    AC -.->|Access Logs| User

    style PG fill:#e1f5fe
    style SR fill:#f3e5f5
    style AC fill:#e8f5e8
    style USDRIF fill:#fff3e0
```

## Detailed Contract Interactions

```mermaid
sequenceDiagram
    participant U as User
    participant SR as ServiceRegistry
    participant PG as PaymentGateway
    participant AC as AccessControl
    participant USDRIF as MockUSDRIF
    participant SO as Service Owner

    Note over SO, PG: Service Creation Flow
    SO->>SR: createService(name, price, duration, endpoints)
    SR->>PG: registerService(serviceId, owner, price, duration)
    PG-->>SR: Service registered
    SR-->>SO: serviceId returned

    Note over U, USDRIF: Payment & Subscription Flow
    U->>USDRIF: approve(PaymentGateway, amount)
    U->>SR: subscribeToService(serviceId, resourceId)
    SR->>PG: makePaymentFrom(user, serviceId, resourceId)
    PG->>USDRIF: transferFrom(user, serviceOwner, price)
    PG->>PG: Create PaymentProof
    PG-->>SR: paymentId
    SR->>SR: Create Subscription & Update Analytics
    SR-->>U: paymentId

    Note over U, AC: Access Control Flow
    U->>AC: requestAccess(resourceId, paymentId)
    AC->>PG: verifyPayment(paymentId, resourceId, duration)
    PG-->>AC: (valid, payer)
    AC->>AC: Grant access & track lastAccess
    AC-->>U: Access granted

    Note over U, AC: Access Verification
    U->>AC: checkAccess(user, resourceId, validityPeriod)
    AC-->>U: hasAccess (boolean)

    Note over SO, PG: Service Management
    SO->>SR: updateService(serviceId, newPrice, active)
    SR->>PG: updateServiceStatus(serviceId, active)
    SR->>PG: updateServicePrice(serviceId, newPrice)
    PG-->>SR: Updates confirmed
```

## Contract Architecture Detail

```mermaid
classDiagram
    class X402PaymentGateway {
        +IERC20 usdrifToken
        +mapping payments
        +mapping services
        +mapping authorizedServices
        +MIN_PAYMENT: 0.001 USDRIF

        +registerService(serviceId, recipient, price, duration)
        +makePayment(serviceId, resourceId)
        +makePaymentFrom(payer, serviceId, resourceId)
        +verifyPayment(paymentId, resourceId, duration)
        +updateServiceStatus(serviceId, active)
        +updateServicePrice(serviceId, newPrice)
        +authorizeService(service, authorized)
    }

    class X402ServiceRegistry {
        +X402PaymentGateway paymentGateway
        +mapping services
        +mapping servicesByOwner
        +mapping subscriptions
        +bytes32[] allServices

        +createService(name, description, price, duration, endpoints)
        +subscribeToService(serviceId, resourceId)
        +updateService(serviceId, newPrice, active)
        +hasActiveSubscription(subscriber, serviceId)
        +getAllServices()
        +getServicesByOwner(owner)
    }

    class X402AccessControl {
        +X402PaymentGateway paymentGateway
        +mapping accessRequests
        +mapping lastAccess

        +requestAccess(resourceId, paymentId)
        +grantAccessWithPayment(requestId, paymentId)
        +checkAccess(user, resourceId, validityPeriod)
        +hasValidAccess(user, resourceId)
    }

    class MockUSDRIF {
        +string name: "USD RIF"
        +string symbol: "USDRIF"
        +uint8 decimals: 18
        +mapping balances
        +mapping allowances

        +transfer(to, amount)
        +transferFrom(from, to, amount)
        +approve(spender, amount)
        +mint(to, amount)
        +faucet()
    }

    X402ServiceRegistry --> X402PaymentGateway : uses
    X402AccessControl --> X402PaymentGateway : uses
    X402PaymentGateway --> MockUSDRIF : transfers
```

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph "Service Layer"
        A[Service Discovery] --> B[Service Creation]
        B --> C[Service Management]
        C --> D[Analytics & Revenue]
    end

    subgraph "Payment Layer"
        E[Payment Processing] --> F[Payment Verification]
        F --> G[Payment Proofs]
        G --> H[Fund Transfer]
    end

    subgraph "Access Layer"
        I[Access Requests] --> J[Payment Validation]
        J --> K[Access Grants]
        K --> L[Access Tracking]
    end

    subgraph "Token Layer"
        M[USDRIF Token] --> N[Balances]
        N --> O[Allowances]
        O --> P[Transfers]
    end

    A -.-> E
    C -.-> E
    E --> M
    F -.-> I
    K -.-> D

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#bbf,stroke:#333,stroke-width:2px
    style I fill:#bfb,stroke:#333,stroke-width:2px
    style M fill:#fbb,stroke:#333,stroke-width:2px
```

## Key Features & Security

```mermaid
mindmap
  root((X402 System))
    Payment Processing
      ERC20 Integration
      Minimum Payment Threshold
      Duplicate Prevention
      Atomic Transactions
    Service Management
      Service Discovery
      Subscription Tracking
      Revenue Analytics
      Price Updates
    Access Control
      Time-based Validity
      Resource Permissions
      Payment Verification
      Access Tracking
    Security Features
      Owner Authorization
      Service Authorization
      Input Validation
      Event Logging
```

## Integration Points

```mermaid
graph LR
    subgraph "External Systems"
        API[API Services]
        AI[AI Agents]
        Web[Web Apps]
        Mobile[Mobile Apps]
    end

    subgraph "X402 Core"
        SR[ServiceRegistry]
        PG[PaymentGateway]
        AC[AccessControl]
    end

    subgraph "Blockchain"
        RSK[Rootstock Network]
        USDRIF[USDRIF Token]
    end

    API --> SR
    AI --> SR
    Web --> AC
    Mobile --> AC

    SR --> PG
    AC --> PG
    PG --> USDRIF

    USDRIF --> RSK
    PG --> RSK

    style SR fill:#e1f5fe
    style PG fill:#f3e5f5
    style AC fill:#e8f5e8
    style RSK fill:#fff3e0
```

This architecture enables:
- **Scalable Service Discovery**: Easy service registration and discovery
- **Secure Payment Processing**: USDRIF-based payments with verification
- **Flexible Access Control**: Time-based resource access management
- **Comprehensive Analytics**: Revenue and usage tracking
- **Cross-Platform Integration**: Support for various client applications