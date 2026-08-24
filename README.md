# 🛒 Ecommerce Microservices Ecosystem

A production-grade, enterprise-ready **Ecommerce Backend Platform** architected with **Node.js, Express 5, MongoDB, RabbitMQ, and Docker**. Designed around **distributed microservices principles, database-per-service isolation, two-phase inventory reservation with compensation, asynchronous event-driven state machines, and API Gateway orchestration**.

The platform is designed to demonstrate how a real-world ecommerce backend can be decomposed into independently deployable services while maintaining reliable, high-performance, and resilient communication between them.

---

## 📌 Table of Contents

1. [System Design & Architecture](#-system-design--architecture)
2. [Core Design Principles](#-core-design-principles)
3. [Microservices Catalog & Repositories](#-microservices-catalog--repositories)
4. [Inter-Service Communication Topology](#-inter-service-communication-topology)
5. [Event-Driven Architecture & RabbitMQ Specification](#-event-driven-architecture--rabbitmq-specification)
6. [Two-Phase Inventory Reservation & Concurrency Control](#-two-phase-inventory-reservation--concurrency-control)
7. [Security, Authentication & RBAC](#-security-authentication--rbac)
8. [Microservice Deep-Dive (Schemas & Endpoints)](#-microservice-deep-dive-schemas--endpoints)
   - [1. API Gateway (Port 5014)](#1-api-gateway-port-5014)
   - [2. Auth Service (Port 5011)](#2-auth-service-port-5011)
   - [3. Product Service (Port 5009)](#3-product-service-port-5009)
   - [4. Cart Service (Port 5010)](#4-cart-service-port-5010)
   - [5. Order Service (Port 5012)](#5-order-service-port-5012)
   - [6. Inventory Service (Port 5016)](#6-inventory-service-port-5016)
   - [7. Payment Service (Port 5013)](#7-payment-service-port-5013)
9. [End-to-End Testing Walkthrough with cURL](#-end-to-end-testing-walkthrough-with-curl)
10. [Docker & Container Orchestration](#-docker--container-orchestration)
11. [Environment Variables Reference](#-environment-variables-reference)
12. [Production Roadmap & Distributed Patterns](#-production-roadmap--distributed-patterns)
13. [Author & License](#-author--license)

---

## ⚙️ System Design & Architecture

<p align="center">
  <img width="100%" alt="Ecommerce Microservices System Design" src="https://github.com/user-attachments/assets/58ea588e-2505-4b59-8afd-3194edb8d29b" />
</p>

The platform decomposes standard ecommerce domains into independently deployable, loosely coupled services. Synchronous operations (queries, auth checks, reverse proxy routing) occur over **HTTP REST**, while critical distributed business state transitions (order placement, inventory reservation, payment processing, cart clearance) occur asynchronously through **RabbitMQ Topic Exchanges**.

```text
                                         CLIENT (Web / Mobile / Postman)
                                                        │
                                                        │ HTTP Requests (Bearer JWT)
                                                        ▼
                        ┌───────────────────────────────────────────────────────────────┐
                        │                    API GATEWAY (:5014)                        │
                        │  - Reverse Proxy (Axios)   - Header Sanitization              │
                        │  - Stateless JWT Verify    - Identity Header Propagation      │
                        └───────┬───────────────────────┬───────────────────────┬───────┘
                                │                       │                       │
           ┌────────────────────┼───────────────────────┼───────────────────────┼────────────────────┐
           │ HTTP (Proxy)       │ HTTP (Proxy)          │ HTTP (Proxy)          │ HTTP (Proxy)       │ HTTP (Proxy)
           ▼                    ▼                       ▼                       ▼                    ▼
┌─────────────────────┐ ┌───────────────┐     ┌───────────────────┐   ┌───────────────────┐ ┌───────────────────┐
│     AUTH SERVICE    │ │PRODUCT SERVICE│     │   CART SERVICE    │   │   ORDER SERVICE   │ │  PAYMENT SERVICE  │
│        :5011        │ │     :5009     │     │       :5010       │   │       :5012       │ │       :5013       │
│  - User Auth / JWT  │ │ - Catalog     │     │ - User Cart Mgmt  │   │ - Order Placement │ │ - Payment Handler │
│  - Password Hashing │ │ - Text Search │     │ - Cart Sync       │   │ - Lifecycle State │ │ - Transaction Log │
└──────────┬──────────┘ └───────┬───────┘     └─────────┬─────────┘   └─────────┬─────────┘ └─────────┬─────────┘
           │                    │                       │                       │                   │
        MongoDB              MongoDB                 MongoDB                 MongoDB             MongoDB
      (auth_db)           (product_db)              (cart_db)               (order_db)         (payment_db)
                                                                                │                   │
                                                                    ORDER_CREATED                   │ PAYMENT_SUCCESS
                                                                                │                   │
                                                                                ▼                   ▼
                                                                ┌───────────────────────────────────────────┐
                                                                │             RABBITMQ BROKER               │
                                                                │       Exchange: `ecommerce_events`        │
                                                                │              (Topic Exchange)             │
                                                                └─────────────────────┬─────────────────────┘
                                                                                      │
                                            ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                                            │ INVENTORY_RESERVED / INVENTORY_FAILED   │ ORDER_CONFIRMED                         │ ORDER_CONFIRMED
                                            ▼                                         ▼                                         ▼
                                ┌───────────────────────┐                 ┌───────────────────────┐                 ┌───────────────────────┐
                                │     ORDER SERVICE     │                 │   INVENTORY SERVICE   │                 │     CART SERVICE      │
                                │         :5012         │                 │         :5016         │                 │         :5010         │
                                │  - Transitions state  │                 │  - Confirms Stock     │                 │  - Empties User Cart  │
                                │    READY_FOR_PAYMENT  │                 │  - Reservation        │                 │    items = []         │
                                │    or CANCELLED       │                 │    -> CONFIRMED       │                 │    totalPrice = 0     │
                                └───────────────────────┘                 └───────────┬───────────┘                 └───────────────────────┘
                                                                                      │
                                                                                   MongoDB
                                                                                (inventory_db)
```

---

## 🎯 Core Design Principles

1. **Single Responsibility**: Each service encapsulates one bounded domain context (Identity & Auth, Catalog, Cart, Orders, Inventory, Payments, Gateway).
2. **Database-per-Service**: Every service owns an isolated MongoDB database. Direct cross-database joins and queries are strictly prohibited.
3. **Smart Endpoints, Dumb Pipes**: Domain validation and state transitions reside entirely within services; RabbitMQ handles reliable routing over durable topics.
4. **Failure Isolation & Resiliency**: If Payment or Inventory is temporarily unavailable, browsing products, querying catalog data, and managing carts remain fully functional.
5. **Eventual Consistency & Idempotency**: Distributed state reconciles asynchronously via events. Message re-delivery is handled via database unique compound indexes and idempotency checks.
6. **Stateless Edge Authentication**: The API Gateway handles stateless token validation and strips spoofed headers before enriching requests with authenticated context (`x-user-id`, `x-user-role`, `x-user-email`).

---

## 🧩 Microservices Catalog & Repositories

All services are structured as modular components and linked via Git submodules:

| Service | Repository Link | Port | Protocol | Primary Database | Key Dependencies | Status |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| **API Gateway** | [ApiGateway-Service](https://github.com/krishu2814/API_GATEWAY-SERVICE-ECOMMERCE-WEBSITE.git) | `5014` | HTTP | — | Auth, Product, Cart, Order, Payment, Inventory | ✅ Active |
| **Auth Service** | [Auth-Service](https://github.com/krishu2814/Auth-Service) | `5011` | HTTP | MongoDB (`ecommerce_auth`) | Bcrypt, JWT | ✅ Active |
| **Product Service** | [Product-Service](https://github.com/krishu2814/Product-Service) | `5009` | HTTP | MongoDB (`ecommerce_product`) | Text Search Indexes | ✅ Active |
| **Cart Service** | [Cart-Service](https://github.com/krishu2814/Cart-Service) | `5010` | HTTP + AMQP | MongoDB (`ecommerce_cart`) | Product Service, RabbitMQ | ✅ Active |
| **Order Service** | [Order-Service](https://github.com/krishu2814/Order-Service) | `5012` | HTTP + AMQP | MongoDB (`ecommerce_order`) | Cart Service, Product Service, RabbitMQ | ✅ Active |
| **Inventory Service** | [Inventory-Service](https://github.com/krishu2814/Inventory-Service.git) | `5016` | HTTP + AMQP | MongoDB (`ecommerce_inventory`) | Product Service, RabbitMQ | ✅ Active |
| **Payment Service** | [Payment-Service](https://github.com/krishu2814/Payment_Service_EcommerceWebsite) | `5013` | HTTP + AMQP | MongoDB (`ecommerce_payment`) | Order Service, RabbitMQ | ✅ Active |

---

## 🔗 Inter-Service Communication Topology

### 1. Synchronous REST Calls (Axios HTTP Client)
- **API Gateway ➔ Downstream Services**: Reverse proxies incoming client requests, injecting verified identity headers (`x-user-id`, `x-user-role`, `x-user-email`).
- **Cart Service ➔ Product Service**: Verifies product existence and fetches real-time pricing via `GET /api/v1/:id`.
- **Order Service ➔ Cart Service**: Fetches active cart items upon order placement via `GET /api/v1/`.
- **Order Service ➔ Product Service**: Captures product name and price snapshots via `GET /api/v1/:id`.
- **Payment Service ➔ Order Service**: Validates order amount and confirms `orderStatus === 'READY_FOR_PAYMENT'` via `GET /api/v1/:id`.
- **Inventory Service ➔ Product Service**: Validates product existence prior to stock initialization via `GET /api/v1/:id`.

### 2. Asynchronous Event-Driven Messaging (RabbitMQ AMQP)
- **Order Service ➔ RabbitMQ**: Emits `ORDER_CREATED` when an order is created with `PENDING` status.
- **Inventory Service ➔ RabbitMQ**: Emits `INVENTORY_RESERVED` on successful stock hold, or `INVENTORY_FAILED` if stock is insufficient.
- **Payment Service ➔ RabbitMQ**: Emits `PAYMENT_SUCCESS` upon transaction authorization.
- **Order Service ➔ RabbitMQ**: Consumes `PAYMENT_SUCCESS`, transitions order to `CONFIRMED`, and emits `ORDER_CONFIRMED`.
- **RabbitMQ ➔ Inventory Service**: Consumes `ORDER_CONFIRMED` to permanently deduct warehouse stock and finalize reservations.
- **RabbitMQ ➔ Cart Service**: Consumes `ORDER_CONFIRMED` to clear user items and reset the shopping cart.

---

## 📡 Event-Driven Architecture & RabbitMQ Specification

### RabbitMQ Topology
- **Exchange Name**: `ecommerce_events`
- **Exchange Type**: `topic`
- **Exchange Durability**: `true` (Survives broker restart)
- **Message Persistence**: `persistent: true` (Delivery mode 2)
- **Consumer QoS**: `channel.prefetch(1)` (Fair workload dispatching)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 EXCHANGE: `ecommerce_events` (topic)                        │
└──────┬───────────────────────┬───────────────────────┬───────────────────────┬──────────────┘
       │ `ORDER_CREATED`       │ `INVENTORY_RESERVED`  │ `PAYMENT_SUCCESS`     │ `ORDER_CONFIRMED`
       ▼                       ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐       ┌─────────────────────────────┐
│  inventory_   │       │    order_     │       │    order_     │       │   cart_order_confirmed_q    │
│  order_queue  │       │  inventory_   │       │ payment_queue │       │ inventory_order_confirmed_q │
└──────┬────────┘       │reserved_queue │       └───────┬───────┘       └──────────────┬──────────────┘
       │                └───────┬───────┘               │                              │
       ▼                        ▼                       ▼                              ▼
Inventory Consumer       Order Consumer          Order Consumer           Cart & Inventory Consumers
```

### Event Payload Contracts

#### 1. `ORDER_CREATED`
* **Routing Key**: `ORDER_CREATED`
* **Publisher**: Order Service
* **Subscriber**: Inventory Service (`inventory_order_queue`)

```json
{
  "event": "ORDER_CREATED",
  "orderId": "65e8a1f2b4c6d8e012345678",
  "userId": "65e89fc1b4c6d8e012345670",
  "amount": 299.98,
  "items": [
    {
      "productId": "65e89d1ab4c6d8e012345601",
      "name": "Wireless Noise-Canceling Headphones",
      "quantity": 2,
      "price": 149.99
    }
  ],
  "timestamp": "2026-08-24T08:00:00.000Z"
}
```

#### 2. `INVENTORY_RESERVED`
* **Routing Key**: `INVENTORY_RESERVED`
* **Publisher**: Inventory Service
* **Subscriber**: Order Service (`order_inventory_reserved_queue`)

```json
{
  "event": "INVENTORY_RESERVED",
  "orderId": "65e8a1f2b4c6d8e012345678",
  "userId": "65e89fc1b4c6d8e012345670",
  "reservations": [
    {
      "id": "65e8a205b4c6d8e012345688",
      "productId": "65e89d1ab4c6d8e012345601",
      "orderId": "65e8a1f2b4c6d8e012345678",
      "userId": "65e89fc1b4c6d8e012345670",
      "quantity": 2,
      "status": "RESERVED"
    }
  ],
  "timestamp": "2026-08-24T08:00:01.000Z"
}
```

#### 3. `INVENTORY_FAILED`
* **Routing Key**: `INVENTORY_FAILED`
* **Publisher**: Inventory Service
* **Subscriber**: Order Service (`order_inventory_failed_queue`)

```json
{
  "event": "INVENTORY_FAILED",
  "orderId": "65e8a1f2b4c6d8e012345678",
  "userId": "65e89fc1b4c6d8e012345670",
  "reason": "Insufficient stock or inventory not found for product 65e89d1ab4c6d8e012345601",
  "timestamp": "2026-08-24T08:00:01.000Z"
}
```

#### 4. `PAYMENT_SUCCESS`
* **Routing Key**: `PAYMENT_SUCCESS`
* **Publisher**: Payment Service
* **Subscriber**: Order Service (`order_payment_queue`)

```json
{
  "event": "PAYMENT_SUCCESS",
  "orderId": "65e8a1f2b4c6d8e012345678",
  "userId": "65e89fc1b4c6d8e012345670",
  "amount": 299.98,
  "transactionId": "TXN_1724486400000",
  "timestamp": "2026-08-24T08:00:05.000Z"
}
```

#### 5. `PAYMENT_FAILED`
* **Routing Key**: `PAYMENT_FAILED`
* **Publisher**: Payment Service
* **Subscribers**: Order Service (`order_payment_failed_queue`), Inventory Service (`inventory_payment_failed_queue`)

```json
{
  "event": "PAYMENT_FAILED",
  "orderId": "65e8a1f2b4c6d8e012345678",
  "userId": "65e89fc1b4c6d8e012345670",
  "amount": 299.98,
  "reason": "Payment transaction was declined or failed",
  "timestamp": "2026-08-24T08:00:05.000Z"
}
```

#### 6. `ORDER_CONFIRMED`
* **Routing Key**: `ORDER_CONFIRMED`
* **Publisher**: Order Service
* **Subscribers**: Inventory Service (`inventory_order_confirmed_queue`), Cart Service (`cart_order_confirmed_queue`)

```json
{
  "event": "ORDER_CONFIRMED",
  "orderId": "65e8a1f2b4c6d8e012345678",
  "userId": "65e89fc1b4c6d8e012345670",
  "transactionId": "TXN_1724486400000",
  "timestamp": "2026-08-24T08:00:06.000Z"
}
```

#### 7. `RESERVATION_EXPIRED`
* **Routing Key**: `RESERVATION_EXPIRED`
* **Publisher**: Inventory Service (Background Expiry Job)
* **Subscriber**: Order Service (`order_reservation_expired_queue`)

```json
{
  "event": "RESERVATION_EXPIRED",
  "orderId": "65e8a1f2b4c6d8e012345678",
  "userId": "65e89fc1b4c6d8e012345670",
  "productId": "65e89d1ab4c6d8e012345601",
  "quantity": 2,
  "reason": "Reservation hold expired after 15 minutes without payment",
  "timestamp": "2026-08-24T08:15:00.000Z"
}
```

---

## 📬 Dead Letter Queues (DLQ) & Exponential Backoff Retry Policy

To guarantee message reliability, prevent silent data loss, and eliminate poison-pill infinite loops, all consumers across the ecosystem are protected by **Dead Letter Queues** and **TTL-based Exponential Backoff Retries**:

```text
                                [ecommerce_events] (Topic Exchange)
                                         │
                                         ▼ (e.g. ORDER_CREATED)
                                [inventory_order_queue]
                                         │
                      ┌──────────────────┴──────────────────┐
                      │                                     │
               (Success / Ack)                       (Consumer Error)
                      │                                     │
                      ▼                                     ▼
                 [Processed]                     [Check x-retry-count]
                                                            │
                                     ┌──────────────────────┴──────────────────────┐
                                     │ (< MAX_RETRIES, e.g. 1/3)                   │ (>= MAX_RETRIES)
                                     ▼                                             ▼
                           [Calculate Backoff Delay]                     [Publish to ecommerce_dlx]
                           (Delay: 2^(retry-1) * 1000ms)                  (Routing: <queue>.dead)
                                     │                                             │
                                     ▼                                             ▼
                        [<queue>_retry_<delay>ms]                        [<queue>_dlq]
                          (TTL = delayMs, DLX -> events)                 (Parked with audit metadata)
                                     │
                              (TTL Expires)
                                     │
                                     └──────────► [Re-routed to Main Queue]
```

### Key DLQ & Retry Capabilities:
1. **Dedicated DLX Topic Exchange (`ecommerce_dlx`)**: Captures all unprocessable messages and routes them to isolated `<queueName>_dlq` queues.
2. **Exponential Backoff Delays**: Retries transient consumer errors with bounded exponential backoff ($1\text{s} \to 2\text{s} \to 4\text{s}$) using RabbitMQ `x-message-ttl` and dead-lettering.
3. **Queue Unblocking**: Failing messages are scheduled in transient delay queues and acknowledged on the primary queue, ensuring healthy messages behind them are never blocked.
4. **Failure Audit Metadata**: Failed messages routed to DLQ are stamped with headers:
   - `x-retry-count`: Total attempts (e.g. `3`).
   - `x-original-queue`: Originating consumer queue name.
   - `x-error-message`: Captured exception string.
   - `x-error-stack`: Full trace for post-mortem debugging.
   - `x-dead-lettered-at`: ISO timestamp when message was parked in DLQ.

---

## 🔒 Two-Phase Inventory Reservation & Concurrency Control

To prevent overselling in high-concurrency environments (such as flash sales), stock is managed via a **Two-Phase Reservation Pattern**:

```text
Physical Stock: [ quantity = 10, reservedQuantity = 0 ]
                           │
                 1. ORDER_CREATED (Qty = 2)
                           ▼
          Atomic Check & Increment:
          (quantity - reservedQuantity >= 2)
                           │
                           ▼
Physical Stock: [ quantity = 10, reservedQuantity = 2 ]
Reservation Doc: [ status = "RESERVED", quantity = 2 ]
                           │
             ┌─────────────┴─────────────┐
     [Payment Successful]        [Payment Failed / Cancelled]
             │                                   │
             ▼                                   ▼
2a. ORDER_CONFIRMED                 2b. Compensation (Release)
  - quantity: 10 -> 8                 - reservedQuantity: 2 -> 0
  - reservedQuantity: 2 -> 0          - Reservation status:
  - Reservation status:                 "RELEASED" / "CANCELLED"
    "CONFIRMED"
```

### 1. Atomic Database Concurrency Query
Stock is held atomically without distributed locks using MongoDB `$expr`:

```javascript
await Inventory.findOneAndUpdate(
  {
    productId,
    $expr: {
      $gte: [{ $subtract: ["$quantity", "$reservedQuantity"] }, quantity],
    },
  },
  {
    $inc: { reservedQuantity: quantity },
  },
  { new: true },
);
```

### 2. Idempotency Protection
A compound unique index on the `Reservation` collection guarantees idempotency against duplicate RabbitMQ messages:

```javascript
reservationSchema.index(
  { orderId: 1, productId: 1 },
  { unique: true, name: "unique_order_product_reservation" }
);
```

### 3. Multi-Item Compensation Rollback
If an order contains multiple items (e.g., Product A and Product B) and Product B has insufficient stock, the Inventory Service automatically releases Product A's hold before emitting `INVENTORY_FAILED`.

---

## 🔐 Security, Authentication & RBAC

```text
Client Request ──► [Authorization: Bearer <JWT>]
                          │
                          ▼
                  API Gateway Hook
          - Strips client x-user-* headers
          - Verifies JWT with SECRET_TOKEN
                          │
              ┌───────────┴───────────┐
         [Token Valid]           [Token Invalid / Expired]
              │                               │
              ▼                               ▼
     Inject Identity Headers:            Return 401 Unauthorized
     - x-user-id: user.id
     - x-user-role: user.role
     - x-user-email: user.email
     - Authorization: Bearer <token>
              │
              ▼
     Proxy to Microservice
```

### Role-Based Access Control (RBAC) Matrix

| Feature / Action | Customer | Vendor | Admin |
| :--- | :---: | :---: | :---: |
| Browse Product Catalog & Search | ✅ | ✅ | ✅ |
| Manage Shopping Cart | ✅ | ✅ | ✅ |
| Place Orders & Process Payment | ✅ | ✅ | ✅ |
| Create / Update Vendor Products | ❌ | ✅ | ✅ |
| Delete Products from Catalog | ❌ | ❌ | ✅ |
| Initialize Stock / Warehouse Adjustments | ❌ | ❌ | ✅ |
| Inspect All User Reservations & Orders | ❌ | ❌ | ✅ |

---

## 📦 Microservice Deep-Dive (Schemas & Endpoints)

### 1. API Gateway (Port 5014)

Central reverse proxy built on Express 5. Receives incoming client requests, verifies authentication headers locally, sanitizes headers to prevent client spoofing, and proxies requests to downstream microservices.

#### Routing Configuration

| Route Prefix | Target Service | Path Forwarding Prefix | Authentication |
| :--- | :--- | :---: | :---: |
| `/api/v1/auth/*` | `http://auth-service:5011` | `""` | Public |
| `/api/v1/products/*` | `http://product-service:5009` | `""` | Public (`GET`) / 🔒 Protected (`POST`, `PATCH`, `DELETE`) |
| `/api/v1/cart/*` | `http://cart-service:5010` | `""` | 🔒 Protected |
| `/api/v1/orders/*` | `http://order-service:5012` | `""` | 🔒 Protected |
| `/api/v1/payment/*` | `http://payment-service:5013` | `""` | 🔒 Protected |
| `/api/v1/inventory/*` | `http://inventory-service:5016` | `"/inventory"` | 🔒 Protected |
| `/api/v1/reservations/*` | `http://inventory-service:5016` | `"/reservations"` | 🔒 Protected |

---

### 2. Auth Service (Port 5011)

Manages user identity, bcrypt password hashing (10 salt rounds), and JWT generation/validation.

#### Mongoose Schema: `User`
```javascript
{
  userName: { type: String },
  email:    { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role:     { type: String, required: true, enum: ['customer', 'admin', 'vendor'], default: 'customer' }
}
```

#### API Endpoints
| Method | Endpoint | Auth | Description | Status Code |
| :--- | :--- | :---: | :--- | :---: |
| `POST` | `/api/v1/signup` | Public | Register a new user | `201 Created` |
| `POST` | `/api/v1/login` | Public | Authenticate user and receive JWT | `200 OK` |
| `GET` | `/api/v1/isAuthenticated` | Token | Verify token authenticity and claims | `200 OK` / `401` |
| `PATCH` | `/api/v1/user/:id` | Token | Update user profile | `200 OK` |
| `DELETE` | `/api/v1/user/:id` | Token | Delete user account | `200 OK` |

---

### 3. Product Service (Port 5009)

Manages the product catalog, categorizations, pricing, and full-text search.

#### Mongoose Schema: `Product`
```javascript
{
  name:        { type: String, required: true, unique: true, trim: true, index: true },
  description: { type: String, required: true, trim: true },
  price:       { type: Number, required: true, min: 0 },
  category:    { type: String, required: true, index: true },
  brand:       { type: String, trim: true },
  images:      [{ type: String }],
  rating:      { type: Number, default: 0, min: 0, max: 5 },
  numReviews:  { type: Number, default: 0 }
}
// Indexes: { name: "text", description: "text" }
```

#### API Endpoints
| Method | Endpoint | Auth | Description | Status Code |
| :--- | :--- | :---: | :--- | :---: |
| `GET` | `/api/v1/` | Public | Search, sort, paginate, and filter catalog | `200 OK` |
| `GET` | `/api/v1/:id` | Public | Fetch product by ID | `200 OK` |
| `POST` | `/api/v1/` | Admin, Vendor | Create a new product | `201 Created` |
| `PATCH` | `/api/v1/:id` | Admin, Vendor | Update product details | `200 OK` |
| `DELETE` | `/api/v1/:id` | Admin | Delete product from catalog | `200 OK` |

---

### 4. Cart Service (Port 5010)

Maintains per-user shopping carts and computes itemized order values.

#### Mongoose Schema: `Cart`
```javascript
{
  userId:     { type: String, required: true, unique: true, index: true },
  items: [{
    productId: { type: String, required: true },
    name:      { type: String },
    image:     { type: String },
    quantity:  { type: Number, required: true, min: 1, default: 1 },
    price:     { type: Number, required: true }
  }],
  totalPrice: { type: Number, required: true, default: 0 }
}
```

#### API Endpoints
| Method | Endpoint | Auth | Description | Status Code |
| :--- | :--- | :---: | :--- | :---: |
| `GET` | `/api/v1/` | Customer | Fetch current user's active cart | `200 OK` |
| `POST` | `/api/v1/` | Customer | Add item to cart (`productId`, `quantity`) | `200 OK` |
| `PATCH` | `/api/v1/:productId` | Customer | Update item quantity | `200 OK` |
| `DELETE` | `/api/v1/:productId` | Customer | Remove specific item from cart | `200 OK` |
| `DELETE` | `/api/v1/` | Customer | Manually clear cart | `200 OK` |

---

### 5. Order Service (Port 5012)

Central orchestrator for order placement, state lifecycle management, and coordination with Inventory and Payment services.

#### Mongoose Schema: `Order`
```javascript
{
  userId:          { type: String, required: true, index: true },
  orderNumber:     { type: String, unique: true },
  items: [{
    productId:     { type: mongoose.Schema.Types.ObjectId, required: true },
    name:          { type: String },
    quantity:      { type: Number, required: true, min: 1 },
    price:         { type: Number, required: true }
  }],
  totalAmount:     { type: Number, required: true },
  orderStatus:     {
    type: String,
    enum: ["PENDING", "READY_FOR_PAYMENT", "CONFIRMED", "CANCELLED", "DELIVERED"],
    default: "PENDING",
    index: true
  },
  paymentStatus:   { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "PENDING" },
  transactionId:   { type: String },
  deliveryAddress: { type: String, required: true }
}
```

#### API Endpoints
| Method | Endpoint | Auth | Description | Status Code |
| :--- | :--- | :---: | :--- | :---: |
| `POST` | `/api/v1/` | Customer | Place order from current user cart | `201 Created` |
| `GET` | `/api/v1/` | Customer | Get all orders for the current user | `200 OK` |
| `GET` | `/api/v1/:id` | Customer | Get order details by ID | `200 OK` |
| `POST` | `/api/v1/:id/cancel` | Customer | Cancel an order and release holds | `200 OK` |

---

### 6. Inventory Service (Port 5016)

Controls warehouse stock levels, tracks 2-phase reservations, and handles compensatory rollbacks.

#### Mongoose Schemas

##### A. `Inventory`
```javascript
{
  productId:        { type: String, required: true, unique: true, index: true },
  quantity:         { type: Number, required: true, min: 0, default: 0 },
  reservedQuantity: { type: Number, required: true, min: 0, default: 0 }
}
```

##### B. `Reservation`
```javascript
{
  productId: { type: String, required: true, index: true },
  orderId:   { type: String, required: true, index: true },
  userId:    { type: String, required: true, index: true },
  quantity:  { type: Number, required: true, min: 1 },
  status:    { type: String, enum: ["RESERVED", "CONFIRMED", "RELEASED", "CANCELLED"], default: "RESERVED", index: true }
}
// Compound Unique Index: { orderId: 1, productId: 1 }
```

#### API Endpoints

##### Inventory Routes (`/api/v1/inventory`)
| Method | Endpoint | Auth | Description | Status Code |
| :--- | :--- | :---: | :--- | :---: |
| `POST` | `/api/v1/inventory` | Admin | Initialize stock for a product | `201 Created` |
| `GET` | `/api/v1/inventory/:productId` | Public / Admin | Check real-time stock levels | `200 OK` |
| `PATCH` | `/api/v1/inventory/:productId/stock` | Admin | Increase warehouse physical stock | `200 OK` |
| `POST` | `/api/v1/inventory/:productId/reserve` | Internal | Test reserving stock manually | `200 OK` |
| `POST` | `/api/v1/inventory/:productId/release` | Internal | Test releasing stock manually | `200 OK` |
| `POST` | `/api/v1/inventory/:productId/confirm` | Internal | Test confirming stock manually | `200 OK` |

##### Reservation Routes (`/api/v1/reservations`)
| Method | Endpoint | Auth | Description | Status Code |
| :--- | :--- | :---: | :--- | :---: |
| `POST` | `/api/v1/reservations` | Internal | Create explicit reservation | `201 Created` |
| `GET` | `/api/v1/reservations/:reservationId` | Customer / Admin | Get reservation by ID | `200 OK` |
| `GET` | `/api/v1/reservations/order/:orderId` | Customer / Admin | Fetch reservation by Order ID | `200 OK` |
| `GET` | `/api/v1/reservations/user/:userId` | Customer / Admin | Fetch reservations for a user | `200 OK` |
| `POST` | `/api/v1/reservations/:reservationId/confirm` | Internal | Confirm reservation | `200 OK` |
| `POST` | `/api/v1/reservations/:reservationId/release` | Internal | Release reservation | `200 OK` |
| `POST` | `/api/v1/reservations/:reservationId/cancel` | Internal | Cancel reservation | `200 OK` |

---

### 7. Payment Service (Port 5013)

Validates order status with Order Service, processes payments, records transaction audit logs, and emits `PAYMENT_SUCCESS`.

#### Mongoose Schema: `Payment`
```javascript
{
  orderId:       { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
  userId:        { type: String, required: true },
  amount:        { type: Number, required: true },
  paymentMethod: { type: String, enum: ["CARD", "UPI", "NETBANKING", "COD"], required: true },
  status:        { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "PENDING" },
  transactionId: { type: String }
}
```

#### API Endpoints
| Method | Endpoint | Auth | Description | Status Code |
| :--- | :--- | :---: | :--- | :---: |
| `POST` | `/api/v1/` | Customer | Authorize payment for a `READY_FOR_PAYMENT` order | `200 OK` |
| `GET` | `/api/v1/:id` | Customer | Get payment audit record | `200 OK` |

---

## 🧪 End-to-End Testing Walkthrough with cURL

Follow this complete step-by-step sequence through the API Gateway (`http://localhost:5014`) to verify the full distributed workflow.

### 1. Register & Authenticate User
```bash
# 1. Sign up admin user
curl -X POST http://localhost:5014/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "Krishu Admin",
    "email": "admin@ecommerce.com",
    "password": "Password123!",
    "role": "admin"
  }'

# 2. Login to obtain JWT
TOKEN=$(curl -s -X POST http://localhost:5014/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ecommerce.com",
    "password": "Password123!"
  }' | jq -r '.data.token')

echo "JWT Token: $TOKEN"
```

### 2. Create Product (Product Service)
```bash
PRODUCT_ID=$(curl -s -X POST http://localhost:5014/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Sony WH-1000XM5 Wireless Headphones",
    "description": "Premium noise-canceling headphones with 30hr battery life",
    "price": 399.99,
    "category": "Electronics",
    "brand": "Sony",
    "images": ["https://images.example.com/sony-xm5.jpg"]
  }' | jq -r '.data._id')

echo "Product ID: $PRODUCT_ID"
```

### 3. Initialize Warehouse Stock (Inventory Service)
```bash
curl -X POST http://localhost:5014/api/v1/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 100
  }"
```

### 4. Add Product to Cart (Cart Service)
```bash
curl -X POST http://localhost:5014/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 2
  }"
```

### 5. Place Order (Order Service ➔ RabbitMQ `ORDER_CREATED`)
```bash
ORDER_ID=$(curl -s -X POST http://localhost:5014/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "deliveryAddress": "221B Baker Street, London, NW1 6XE"
  }' | jq -r '.data._id')

echo "Order ID: $ORDER_ID"

# Wait for Inventory Service to consume ORDER_CREATED and reserve stock
sleep 1

# Check Order Status -> Transitions to "READY_FOR_PAYMENT"
curl -s -X GET "http://localhost:5014/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.orderStatus'
```

### 6. Process Payment (Payment Service ➔ `PAYMENT_SUCCESS` ➔ `ORDER_CONFIRMED`)
```bash
# Authorize payment
curl -X POST http://localhost:5014/api/v1/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"paymentMethod\": \"CARD\"
  }"

# Wait for Order Service, Inventory Service, and Cart Service to process ORDER_CONFIRMED
sleep 1

# 1. Verify Order is now CONFIRMED
curl -s -X GET "http://localhost:5014/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.orderStatus'

# 2. Verify Cart was automatically cleared by event consumer
curl -s -X GET http://localhost:5014/api/v1/cart \
  -H "Authorization: Bearer $TOKEN" | jq '.data'

# 3. Verify Stock was permanently deducted (100 -> 98)
curl -s -X GET "http://localhost:5014/api/v1/inventory/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data'
```

---

## 🐳 Docker & Container Orchestration

The entire microservice ecosystem, along with MongoDB databases and the RabbitMQ message broker, is orchestrated using Docker Compose.

```bash
# 1. Clone repository with all service submodules
git clone --recurse-submodules https://github.com/krishu2814/Ecommerce-Website.git
cd Ecommerce-Website

# 2. Start all microservices in detached mode with build
docker compose up -d --build

# 3. View real-time aggregated logs
docker compose logs -f

# 4. Check status and health of all containers
docker compose ps

# 5. Stop and tear down all containers and networks
docker compose down
```

### Startup Coordination & Health Checks
- **RabbitMQ**: Runs health checks via `rabbitmq-diagnostics -q ping`.
- **Domain Services**: (`cart-service`, `order-service`, `payment-service`, `inventory-service`) wait for RabbitMQ health (`condition: service_healthy`).
- **API Gateway**: Starts after all 6 domain microservices are initialized.

---

## ⚙️ Environment Variables Reference

| Variable Name | Required By Services | Description | Default / Example Value |
| :--- | :--- | :--- | :--- |
| `PORT` | All Services | HTTP listening port | `5014`, `5011`, `5009`, `5010`, `5012`, `5016`, `5013` |
| `MONGO_URL` | Auth, Product, Cart, Order, Inventory, Payment | MongoDB connection URI | `mongodb://localhost:27017/ecommerce_order` |
| `SECRET_TOKEN` | Auth, API Gateway, Cart, Order, Inventory, Payment | Secret key for JWT signing & verification | `super_secret_jwt_key_32_chars` |
| `EXPIRES_IN` | Auth Service | JWT validity duration | `1d`, `7d` |
| `RABBITMQ_URL` | Cart, Order, Inventory, Payment | AMQP connection string | `amqp://rabbitmq:5672` |
| `EXCHANGE_NAME` | Cart, Order, Inventory, Payment | Topic exchange name | `ecommerce_events` |
| `AUTH_SERVICE_URL` | API Gateway | Base URL for Auth Service | `http://auth-service:5011` |
| `PRODUCT_SERVICE_URL` | API Gateway, Cart, Order, Inventory | Base URL for Product Service | `http://product-service:5009` |
| `CART_SERVICE_URL` | API Gateway, Order | Base URL for Cart Service | `http://cart-service:5010` |
| `ORDER_SERVICE_URL` | API Gateway, Payment, Inventory | Base URL for Order Service | `http://order-service:5012` |
| `PAYMENT_SERVICE_URL` | API Gateway | Base URL for Payment Service | `http://payment-service:5013` |
| `INVENTORY_SERVICE_URL` | API Gateway | Base URL for Inventory Service | `http://inventory-service:5016` |
| `REDIS_URL` | API Gateway, Product Service | Redis connection URI | `redis://localhost:6379`, `redis://redis:6379` |

---

## ⚡ Redis Distributed Caching & Gateway Rate Limiting

### 1. Product Catalog Cache-Aside Engine
To achieve sub-millisecond catalog reads and offload database pressure from MongoDB:
- **`GET /api/v1/products/:id`**: Cached in Redis under key `product:${id}` with a **1-hour TTL (3600s)**.
- **`GET /api/v1/products` (Catalog Query/Filter)**: Cached in Redis under deterministic query hash `products:list:${hash}` with a **5-minute TTL (300s)**.
- **Event-Driven Cache Invalidation**:
  - `POST /products`: Automatically purges `products:list:*` using non-blocking Redis `SCAN`.
  - `PATCH /products/:id`: Invalidates `product:${id}` and all `products:list:*` cache entries.
  - `DELETE /products/:id`: Evicts `product:${id}` and `products:list:*` caches.
- **Observability**: Responses include standard `X-Cache: HIT` or `X-Cache: MISS` headers.

### 2. Tiered Sliding-Window Rate Limiting at API Gateway
Implemented via an atomic Redis pipeline (`INCR` + `EXPIRE` / `TTL`) to protect downstream microservices:
- **Auth Endpoint (`/api/v1/auth/*`)**: Strict limit of **15 requests/minute** per IP (prevents credential stuffing and brute-force attacks).
- **Checkout & Orders (`/api/v1/orders`, `/api/v1/payment`)**: Limit of **30 requests/minute** per authenticated user / IP (prevents duplicate rapid order placement & card-testing bots).
- **General Traffic (Default)**: Limit of **100 requests/minute** per client across all other routes.
- **Standards-Compliant Headers**: Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` on HTTP `429 Too Many Requests`.
- **Fail-Open Strategy**: If Redis is momentarily unreachable, the gateway logs a warning and gracefully passes traffic through to prevent catastrophic cascading outages.

---

## 🔮 Production Roadmap & Distributed Patterns

- [x] **Choreographed Saga Failure Handling & Automated Rollbacks**: `PAYMENT_FAILED` triggers automatic `releaseReservationsByOrderId()` in Inventory and transitions Order to `CANCELLED`.
- [x] **Reservation TTL Expiry & Compensation**: Background worker sweeps unfulfilled reservations (>15m), releases physical inventory, and emits `RESERVATION_EXPIRED` to cancel lingering orders.
- [x] **Dead Letter Queues (DLQ) & Exponential Backoff Retries**: Dedicated DLX topic exchange (`ecommerce_dlx`), isolated `${queueName}_dlq` parking, and multi-stage TTL delay queues (1s ➔ 2s ➔ 4s) with audit metadata headers.
- [x] **Redis Distributed Caching & Cache Invalidation**: Sub-millisecond catalog reads via Cache-Aside pattern, non-blocking `SCAN` invalidation on mutations, and `X-Cache` observability.
- [x] **API Rate Limiting**: Distributed sliding-window rate limiting at API Gateway (15 req/min auth, 30 req/min orders, 100 req/min general) using Redis.
- [ ] **Distributed Tracing & Correlation IDs**: Propagate `x-correlation-id` through the API Gateway, HTTP headers, and RabbitMQ message properties for end-to-end request tracing.
- [ ] **Observability**: Integrate Prometheus, Grafana, OpenTelemetry, and Jaeger for centralized metrics and latency telemetry.
- [ ] **Kubernetes (K8s) Deployment**: Package services into Helm charts with Horizontal Pod Autoscaling (HPA) and Ingress routing.

---

## 👨‍💻 Author & License

**Krishu Kumar**  
Indian Institute of Information Technology (IIIT), Ranchi  
_Specializing in Backend Engineering, Distributed Systems, Microservices & Cloud Architecture_

- **GitHub**: [@krishu2814](https://github.com/krishu2814)
- **LinkedIn**: [Krishu Kumar](https://linkedin.com/in/krishu2814)
- **Email**: [krishukumarsingh06@gmail.com](mailto:krishukumarsingh06@gmail.com)

---

_This project is intended for educational, portfolio, and architecture experimentation purposes. Licensed under the [MIT License](LICENSE)._
