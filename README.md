# 🛒 Ecommerce Microservices Ecosystem

A production-oriented **Full-Stack Ecommerce Backend** built using a **Microservices Architecture**, designed around **independent services, event-driven communication, database-per-service, inventory reservation, payment processing, and asynchronous business workflows**.
A production-grade, enterprise-ready **Ecommerce Backend Platform** architected with **Node.js, Express 5, MongoDB, RabbitMQ, and Docker**. Designed around **distributed microservices principles, database-per-service isolation, two-phase inventory reservation with compensation, asynchronous event-driven state machines, and API Gateway orchestration**.

## The project is designed to demonstrate how a real-world ecommerce platform can be decomposed into independently deployable services while maintaining reliable communication between them.

## 📌 Table of Contents

1. [Architecture & System Design](#-architecture--system-design)
2. [Microservices Catalog & Port Allocation](#-microservices-catalog--port-allocation)
3. [Inter-Service Communication Topology](#-inter-service-communication-topology)
4. [Event-Driven Architecture & RabbitMQ Specification](#-event-driven-architecture--rabbitmq-specification)
5. [Two-Phase Inventory Reservation & Concurrency Control](#-two-phase-inventory-reservation--concurrency-control)
6. [Security, Authentication & RBAC](#-security-authentication--rbac)
7. [Microservice Deep-Dive (Schemas & Endpoints)](#-microservice-deep-dive-schemas--endpoints)
   - [API Gateway](#1-api-gateway-port-5014)
   - [Auth Service](#2-auth-service-port-5011)
   - [Product Service](#3-product-service-port-5009)
   - [Cart Service](#4-cart-service-port-5010)
   - [Order Service](#5-order-service-port-5012)
   - [Inventory Service](#6-inventory-service-port-5016)
   - [Payment Service](#7-payment-service-port-5013)
8. [End-to-End Testing Walkthrough with cURL](#-end-to-end-testing-walkthrough-with-curl)
9. [Docker & Container Orchestration](#-docker--container-orchestration)
10. [Environment Variables Reference](#-environment-variables-reference)
11. [Production Roadmap & Distributed Patterns](#-production-roadmap--distributed-patterns)
12. [Author & License](#-author--license)

## ⚙️ System Design

<img width="1415" height="842" alt="SystemDesignEcommerce" src="https://github.com/user-attachments/assets/58ea588e-2505-4b59-8afd-3194edb8d29b" />

## 🏗️ Architecture & System Design

The platform decomposes standard ecommerce domains into independently deployable, loosely coupled services. Synchronous operations (queries, auth checks) occur over **HTTP REST**, while critical business transitions (order placement, inventory reservation, payment completion, cart clearance) occur asynchronously through **RabbitMQ Topic Exchanges**.

```text
                                         CLIENT (Web / Mobile / Postman)
                                                        │
                                                        │ HTTP Requests
                                                        ▼
                        ┌───────────────────────────────────────────────────────────────┐
                        │                    API GATEWAY (:5014)                        │
                        │  - Single Entry Point      - Reverse Proxy (Axios)            │
                        │  - JWT Verification Hook   - Identity Header Propagation      │
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
                                │  - Transitions state  │                 │  - Confirms Deduction │                 │  - Empties User Cart  │
                                │    READY_FOR_PAYMENT  │                 │  - Reservation        │                 │    items = []         │
                                │    or CANCELLED       │                 │    -> CONFIRMED       │                 │    totalPrice = 0     │
                                └───────────────────────┘                 └───────────┬───────────┘                 └───────────────────────┘
                                                                                      │
                                                                                   MongoDB
                                                                                (inventory_db)
```

### Core Design Principles

1. **Single Responsibility**: Each service encapsulates one business boundary (Authentication, Catalog, Cart, Orders, Inventory, Payments).
2. **Database-per-Service**: Services have private MongoDB databases. Direct cross-database access is prohibited.
3. **Smart Endpoints, Dumb Pipes**: Business logic resides within domain services; RabbitMQ routes raw event payloads over topics.
4. **Failure Isolation**: If the Payment or Inventory service undergoes maintenance, users can still browse products and manage carts.
5. **Eventual Consistency**: Distributed state transitions reconcile asynchronously via events without distributed locks.

---

## 📌 Overview

## 🧩 Microservices Catalog & Port Allocation

This project implements a distributed ecommerce ecosystem consisting of multiple independent microservices.
| Service | Directory | Port | Protocol | Primary Database | Key Dependencies | Status |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| **API Gateway** | `services/ApiGateway-Service` | `5014` | HTTP | — | Auth, Product, Cart, Order, Payment, Inventory | ✅ Active |
| **Auth Service** | `services/Auth-Service` | `5011` | HTTP | MongoDB (`ecommerce_auth`) | — | ✅ Active |
| **Product Service** | `services/Product-Service` | `5009` | HTTP | MongoDB (`ecommerce_product`) | Auth _(for RBAC role verification)_ | ✅ Active |
| **Cart Service** | `services/Cart-Service` | `5010` | HTTP + AMQP | MongoDB (`ecommerce_cart`) | Product Service, RabbitMQ | ✅ Active |
| **Order Service** | `services/Order-Service` | `5012` | HTTP + AMQP | MongoDB (`ecommerce_order`) | Cart Service, Product Service, RabbitMQ | ✅ Active |
| **Inventory Service** | `services/Inventory-Service` | `5016` | HTTP + AMQP | MongoDB (`ecommerce_inventory`) | Product Service, Order Service, RabbitMQ | ✅ Active |
| **Payment Service** | `services/Payment-Service` | `5013` | HTTP + AMQP | MongoDB (`ecommerce_payment`) | Order Service, RabbitMQ | ✅ Active |

## **The system supports:**

- User authentication and authorization (JWT & RBAC)
- Product catalog management
- Shopping cart management
- Order creation and lifecycle management
- Inventory management & robust inventory reservation
- Payment processing
- Event-driven communication using RabbitMQ
- API Gateway-based request routing
- Independent databases per service
- Dockerized services
- Idempotent inventory reservations
- Asynchronous order/payment/inventory workflows

## 🔗 Inter-Service Communication Topology

_The architecture is intentionally designed to demonstrate concepts used in production distributed systems rather than building the entire ecommerce application as a single monolithic backend._

### Synchronous REST Calls (HTTP Client via Axios)

- **API Gateway ➔ Auth Service**: Validates JWT on incoming protected requests via `GET /api/v1/auth/isAuthenticated`.
- **API Gateway ➔ Downstream Services**: Forwards requests with injected identity headers (`x-user-id`, `x-user-role`, `x-user-email`).
- **Cart Service ➔ Product Service**: Verifies product existence and retrieves real-time pricing via `GET /api/v1/:id`.
- **Order Service ➔ Cart Service**: Fetches the user's active shopping cart items during order placement via `GET /api/v1/`.
- **Order Service ➔ Product Service**: Fetches product snapshot (name, current unit price) via `GET /api/v1/:id`.
- **Payment Service ➔ Order Service**: Retrieves order verification data (`totalAmount`, `orderStatus === 'READY_FOR_PAYMENT'`) via `GET /api/v1/:id`.
- **Inventory Service ➔ Product Service**: Validates product existence prior to stock initialization via `GET /api/v1/:id`.

## ⚙️ System Design

<img width="1415" height="842" alt="SystemDesignEcommerce" src="https://github.com/user-attachments/assets/58ea588e-2505-4b59-8afd-3194edb8d29b" />
### Asynchronous Event-Driven Messaging (RabbitMQ)
- **Order Service ➔ RabbitMQ**: Publishes `ORDER_CREATED` when order is submitted in `PENDING` state.
- **Inventory Service ➔ RabbitMQ**: Publishes `INVENTORY_RESERVED` (if stock exists) or `INVENTORY_FAILED` (if out of stock).
- **Payment Service ➔ RabbitMQ**: Publishes `PAYMENT_SUCCESS` after receiving successful payment authorization.
- **Order Service ➔ RabbitMQ**: Publishes `ORDER_CONFIRMED` upon receiving `PAYMENT_SUCCESS`.
- **RabbitMQ ➔ Inventory Service**: Consumes `ORDER_CONFIRMED` to permanently deduct stock and mark reservation `CONFIRMED`.
- **RabbitMQ ➔ Cart Service**: Consumes `ORDER_CONFIRMED` to reset the user's shopping cart.

---

## 📡 Event-Driven Architecture & RabbitMQ Specification

## 🏗️ Architecture

### RabbitMQ Topology

- **Exchange Name**: `ecommerce_events`
- **Exchange Type**: `topic`
- **Exchange Durability**: `true` (Survives broker restart)
- **Message Persistence**: `persistent: true` (Delivery mode 2)
- **Consumer QoS**: `channel.prefetch(1)` (Fair dispatching)

```text
                              Client
                                │
                                ▼
                         ┌──────────────┐
                         │ API Gateway  │
                         └──────┬───────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
   Auth Service          Product Service        Cart Service
          │                     │                     │
          ▼                     ▼                     ▼
       MongoDB               MongoDB               MongoDB
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

                                │
                                ▼
                         ┌──────────────┐
                         │ Order Service│
                         └──────┬───────┘
                                │
                                │ ORDER_CREATED
                                ▼
                       ┌──────────────────┐
                       │     RabbitMQ     │
                       │ ecommerce_events │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Inventory Service│
                       └────────┬─────────┘
                                │
                         ┌──────┴──────┐
                         │             │
                         ▼             ▼
                    Inventory     Reservation
                      Model          Model
                         │             │
                         └──────┬──────┘
                                │
                                ▼
                             MongoDB

### Event Specifications & Payloads

Payment Service
│
│ PAYMENT_SUCCESS
▼
RabbitMQ
│
▼
Order Service
│
│ ORDER_CONFIRMED
▼
RabbitMQ
│
├──────────────────► Inventory Service
│
└──────────────────► Cart Service

#### 1. `ORDER_CREATED`

- **Routing Key**: `ORDER_CREATED`
- **Publisher**: Order Service
- **Subscriber**: Inventory Service (`inventory_order_queue`)
- **Payload Schema**:

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
  ]
}
```

#### 2. `INVENTORY_RESERVED`

- **Routing Key**: `INVENTORY_RESERVED`
- **Publisher**: Inventory Service
- **Subscriber**: Order Service (`order_inventory_reserved_queue`)
- **Payload Schema**:

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
  "timestamp": "2026-08-24T08:00:00.000Z"
}
```

#### 3. `INVENTORY_FAILED`

- **Routing Key**: `INVENTORY_FAILED`
- **Publisher**: Inventory Service
- **Subscriber**: Order Service (`order_inventory_failed_queue`)
- **Payload Schema**:

```json
{
  "event": "INVENTORY_FAILED",
  "orderId": "65e8a1f2b4c6d8e012345678",
  "userId": "65e89fc1b4c6d8e012345670",
  "reason": "Insufficient stock or inventory not found for product 65e89d1ab4c6d8e012345601",
  "timestamp": "2026-08-24T08:00:00.000Z"
}
```

#### 4. `PAYMENT_SUCCESS`

- **Routing Key**: `PAYMENT_SUCCESS`
- **Publisher**: Payment Service
- **Subscriber**: Order Service (`order_payment_queue`)
- **Payload Schema**:

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

#### 5. `ORDER_CONFIRMED`

- **Routing Key**: `ORDER_CONFIRMED`
- **Publisher**: Order Service
- **Subscribers**: Inventory Service (`inventory_order_confirmed_queue`), Cart Service (`cart_order_confirmed_queue`)
- **Payload Schema**:

```json
{
  "event": "ORDER_CONFIRMED",
  "orderId": "65e8a1f2b4c6d8e012345678",
  "userId": "65e89fc1b4c6d8e012345670",
  "transactionId": "TXN_1724486400000",
  "timestamp": "2026-08-24T08:00:06.000Z"
}
```

---

## 🧩 Microservices

## 🔒 Two-Phase Inventory Reservation & Concurrency Control

The system consists of the following independently deployable services:
In high-concurrency flash sales, overselling is prevented through a **Two-Phase Reservation Pattern** backed by atomic MongoDB expressions:

| Service               | Responsibility                    | Database | Status         |
| :-------------------- | :-------------------------------- | :------- | :------------- |
| **Auth Service**      | Authentication & authorization    | MongoDB  | ✅ Active      |
| **Product Service**   | Product catalog management        | MongoDB  | ✅ Active      |
| **Cart Service**      | Shopping cart management          | MongoDB  | ✅ Active      |
| **Order Service**     | Orders & lifecycle management     | MongoDB  | ✅ Active      |
| **Inventory Service** | Stock management & reservations   | MongoDB  | ✅ Active      |
| **Payment Service**   | Payment processing workflows      | MongoDB  | 🚧 In Progress |
| **API Gateway**       | Central API entry point & routing | —        | ✅ Active      |

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
     [Payment Successful]        [Payment Failed / Timeout]
             │                                   │
             ▼                                   ▼
2a. ORDER_CONFIRMED                 2b. Compensation (Release)
  - quantity: 10 -> 8                 - reservedQuantity: 2 -> 0
  - reservedQuantity: 2 -> 0          - Reservation status:
  - Reservation status:                 "RELEASED" / "CANCELLED"
    "CONFIRMED"
```

### 1. Atomic Concurrency Query

The `reserveStock` repository operation executes atomic condition checking at the database level:

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

To prevent duplicate reservations from re-delivered RabbitMQ messages, the `Reservation` collection enforces a **compound unique index**:

```javascript
reservationSchema.index(
  { orderId: 1, productId: 1 },
  { unique: true, name: "unique_order_product_reservation" },
);
```

If a duplicate event arrives, `findByOrderIdAndProductId` returns the existing reservation without incrementing `reservedQuantity` a second time.

### 3. Automatic Compensation

If an order contains multiple items (e.g. Item A and Item B) and Item B fails stock validation, the Inventory Service automatically executes a compensating rollback for Item A before broadcasting `INVENTORY_FAILED`.

---

<<<<<<< HEAD

## 📦 Service Catalog

- CLICK on the link below to visit each service and and their detailed explanation.

| Service         | Repository                                                     | Status    |
| --------------- | -------------------------------------------------------------- | --------- |
| Auth Service    | https://github.com/krishu2814/Auth-Service                     | ✅ Active |
| Product Service | https://github.com/krishu2814/Product-Service                  | ✅ Active |
| Cart Service    | https://github.com/krishu2814/Cart-Service                     | ✅ Active |
| Order Service   | https://github.com/krishu2814/Order-Service                    | ✅ Active |
| Payment Service | https://github.com/krishu2814/Payment_Service_EcommerceWebsite | ✅ Active |

=======

---

## 📡 Event-Driven Architecture (RabbitMQ)

RabbitMQ is used for asynchronous communication, preventing tight coupling between services.

### 🔄 Complete Order Workflow

```text
                ORDER SERVICE
                     │
                     │ ORDER_CREATED
                     ▼
                  RabbitMQ
                     │
                     ▼
             INVENTORY SERVICE
                     │
                     ▼
              Reserve Inventory
                     │
                     ▼
            Reservation RESERVED
                     │
                     ▼
             INVENTORY_RESERVED
                     │
                     ▼
                ORDER SERVICE
                     │
                     ▼
              READY_FOR_PAYMENT
                     │
                     │
                     ▼
              PAYMENT SERVICE
                     │
                     ▼
               Process Payment
                     │
                     ▼
               PAYMENT_SUCCESS
                     │
                     ▼
                RabbitMQ
                     │
                     ▼
                ORDER SERVICE
                     │
                     ▼
             ORDER_CONFIRMED
                     │
              ┌──────┴──────┐
              │             │
              ▼             ▼
        INVENTORY        CART
          SERVICE       SERVICE
              │             │
              ▼             ▼
      Confirm Stock     Clear Cart
              │
              ▼
     Reservation CONFIRMED
```

### 🔒 Idempotency & Reliability

---

Distributed systems can deliver the same message more than once. The Inventory Service checks the `(orderId, productId)` compound unique index before creating a reservation. If a duplicate `ORDER_CREATED` event arrives, the service safely returns the existing reservation.

## 🔐 Security, Authentication & RBAC

```text
Client Request ──► [Authorization: Bearer <JWT>]
                          │
                          ▼
                  API Gateway Hook
                          │
                          ▼
            GET /api/v1/auth/isAuthenticated ──► Auth Service
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
     Forward to Microservice
```

### Role-Based Access Control (RBAC) Matrix

- **`customer`**: Browse catalog, manage own cart, place orders, make payments, inspect personal orders.
- **`vendor`**: All customer capabilities + create and update vendor products.
- **`admin`**: Full platform authority + delete products, manual stock overrides, inspect platform telemetry.

---

## 🗄️ Database-per-Service Pattern

## 📦 Microservice Deep-Dive (Schemas & Endpoints)

Each service strictly owns its own database. Services **never** directly query another service's database. Communication happens exclusively through REST APIs (synchronous) or RabbitMQ events (asynchronous).

---

## ⚙️ Technology Stack

### 1. API Gateway (`:5014`)

Central reverse proxy built on Express 5. Receives incoming client requests, verifies authentication headers with the Auth Service, attaches decoded user claims, and proxies to the respective microservice.

- **Backend:** Node.js, Express.js, JavaScript, TypeScript
- **Database:** MongoDB, Mongoose
- **Messaging:** RabbitMQ, AMQP (Topic Exchanges)
- **Authentication:** JWT, Bcrypt
- **HTTP Communication:** Axios
- **DevOps:** Docker, Docker Compose, Git, GitHub
- **Architecture Patterns:** Microservices, Event-Driven, API Gateway, Database-per-Service, Saga Concepts
  > > > > > > > 476dfe0 (feat(inventory): implement event-driven reservation and order confirmation flow)

#### Routing Configuration

| Route Prefix          | Target Service                  |          Authentication           |
| :-------------------- | :------------------------------ | :-------------------------------: |
| `/api/v1/auth/*`      | `http://auth-service:5011`      |              Public               |
| `/api/v1/products/*`  | `http://product-service:5009`   | Public (Read) / Protected (Write) |
| `/api/v1/cart/*`      | `http://cart-service:5010`      |           🔒 Protected            |
| `/api/v1/orders/*`    | `http://order-service:5012`     |           🔒 Protected            |
| `/api/v1/payment/*`   | `http://payment-service:5013`   |           🔒 Protected            |
| `/api/v1/inventory/*` | `http://inventory-service:5016` |  🔒 Protected (Admin / Internal)  |

---

## 🚀 Getting Started

### 2. Auth Service (`:5011`)

Manages identity, credential security (bcrypt 10 salt rounds), and JWT lifecycle.

### 1. Clone Repository

This parent repository manages individual services as Git submodules.

````bash
git clone --recurse-submodules [https://github.com/krishu2814/Ecommerce-Website.git](https://github.com/krishu2814/Ecommerce-Website.git)
cd Ecommerce-Website
#### Mongoose Schema: `User`
```javascript
{
  userName: { type: String },
  email:    { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true }, // Hashed bcrypt
  role:     { type: String, required: true, enum: ['customer', 'admin', 'vendor'], default: 'customer' }
}
````

### 2. Environment Variables

#### API Endpoints

| Method   | Endpoint                  |  Auth  | Description                          |   Status Code    |
| :------- | :------------------------ | :----: | :----------------------------------- | :--------------: |
| `POST`   | `/api/v1/signup`          | Public | Register new user account            |  `201 Created`   |
| `POST`   | `/api/v1/login`           | Public | Authenticate user & return JWT       |     `200 OK`     |
| `GET`    | `/api/v1/isAuthenticated` | Token  | Internal token verification endpoint | `200 OK` / `401` |
| `PATCH`  | `/api/v1/user/:id`        | Token  | Update user profile                  |     `200 OK`     |
| `DELETE` | `/api/v1/user/:id`        | Token  | Delete user account                  |     `200 OK`     |

## Each service maintains its own `.env` configuration. Copy the provided `.env.example` in each service to a new `.env` file and update the values.

### 3. Run RabbitMQ (Docker)

### 3. Product Service (`:5009`)

Manages the product catalog, classifications, price definitions, and full-text search.

RabbitMQ must be running before starting services.

````bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
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
````

_Management UI available at `http://localhost:15672` (guest/guest)_

#### API Endpoints

| Method   | Endpoint      |     Auth      | Description                                 |  Status Code  |
| :------- | :------------ | :-----------: | :------------------------------------------ | :-----------: |
| `GET`    | `/api/v1/`    |    Public     | Filter, sort, paginate, and search products |   `200 OK`    |
| `GET`    | `/api/v1/:id` |    Public     | Get product details by ID                   |   `200 OK`    |
| `POST`   | `/api/v1/`    | Admin, Vendor | Create new product                          | `201 Created` |
| `PATCH`  | `/api/v1/:id` | Admin, Vendor | Update product details                      |   `200 OK`    |
| `DELETE` | `/api/v1/:id` |     Admin     | Delete product from catalog                 |   `200 OK`    |

### 4. Install & Run Services

---

Navigate to each service directory, install dependencies, and start the development server:

### 4. Cart Service (`:5010`)

Manages per-user shopping carts and computes itemized totals.

````bash
cd Inventory-Service
npm install
npm run dev
#### Mongoose Schema: `Cart`
```javascript
{
  userId:     { type: String, required: true, unique: true, index: true },
  items: [{
    productId: { type: String, required: true },
    quantity:  { type: Number, required: true, min: 1, default: 1 },
    price:     { type: Number, required: true }
  }],
  totalPrice: { type: Number, required: true, default: 0 }
}
````

#### API Endpoints

| Method   | Endpoint             |   Auth   | Description                                | Status Code |
| :------- | :------------------- | :------: | :----------------------------------------- | :---------: |
| `GET`    | `/api/v1/`           | Customer | Fetch current user's active cart           |  `200 OK`   |
| `POST`   | `/api/v1/`           | Customer | Add item to cart (`productId`, `quantity`) |  `200 OK`   |
| `PATCH`  | `/api/v1/:productId` | Customer | Update item quantity (`quantity`)          |  `200 OK`   |
| `DELETE` | `/api/v1/`           | Customer | Manually clear cart contents               |  `200 OK`   |

---

## 🔮 Future Improvements

### 5. Order Service (`:5012`)

Central orchestrator for order placement, state transitions, and coordination with Inventory and Payment.

This project is designed as a continuously evolving production-style learning project. Some components are intentionally simplified and will be enhanced in the future:

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

### 1. Real Payment Gateway

#### API Endpoints

| Method | Endpoint      |   Auth   | Description                       |  Status Code  |
| :----- | :------------ | :------: | :-------------------------------- | :-----------: |
| `POST` | `/api/v1/`    | Customer | Place new order from current cart | `201 Created` |
| `GET`  | `/api/v1/:id` | Customer | Get order details by ID           |   `200 OK`    |

## Integrate Razorpay, Stripe, or PayPal via webhooks.

```text
Payment Initiated ──► Payment Gateway ──► Webhook ──► Payment Service ──► PAYMENT_SUCCESS
```

### 6. Inventory Service (`:5016`)

Controls physical warehouse stock levels, tracks 2-phase reservation hold state, and executes compensatory rollbacks.

### 2. Saga Pattern

#### Mongoose Schemas

The complete order workflow can evolve into a Saga for better distributed transaction management.

````text
Create Order ──► Reserve Inventory ──► Process Payment
                                            │
                             ┌──────────────┴──────────────┐
                             │                             │
                          Success                       Failure
                             │                             │
                             ▼                             ▼
                       Confirm Order               Release Inventory
                                                           │
                                                           ▼
                                                      Cancel Order
##### A. `Inventory`
```javascript
{
  productId:        { type: String, required: true, unique: true, index: true },
  quantity:         { type: Number, required: true, min: 0, default: 0 },
  reservedQuantity: { type: Number, required: true, min: 0, default: 0 }
}
````

### 3. Dead Letter Queues (DLQs)

Introduce DLQs for every critical event consumer to handle failed messages securely.

````text
Main Queue ──► Consumer ──┬──► Success (ACK)
                          │
                          └──► Failure (NACK) ──► DLQ
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
````

### 4. Event Retry Strategy

#### API Endpoints

| Method  | Endpoint                               |       Auth       | Description                            |  Status Code  |
| :------ | :------------------------------------- | :--------------: | :------------------------------------- | :-----------: |
| `POST`  | `/api/v1/inventory`                    |      Admin       | Initialize stock for a product         | `201 Created` |
| `GET`   | `/api/v1/inventory/:productId`         |  Public / Admin  | Check real-time stock levels           |   `200 OK`    |
| `PATCH` | `/api/v1/inventory/:productId/stock`   |      Admin       | Add physical warehouse units           |   `200 OK`    |
| `POST`  | `/api/v1/inventory/:productId/reserve` |     Internal     | Manually test reserving stock          |   `200 OK`    |
| `POST`  | `/api/v1/inventory/:productId/release` |     Internal     | Manually test releasing stock          |   `200 OK`    |
| `POST`  | `/api/v1/inventory/:productId/confirm` |     Internal     | Manually test confirming stock         |   `200 OK`    |
| `GET`   | `/api/v1/reservations/order/:orderId`  | Customer / Admin | Fetch reservation records for an order |   `200 OK`    |

## Introduce controlled retries with exponential backoff to prevent excessive load on temporary failures.

```text
Attempt 1 ──► Failed ──► Attempt 2 ──► Failed ──► Attempt 3 ──► Failed ──► DLQ
```

### 7. Payment Service (`:5013`)

Simulates payment transactions, validates order state with Order Service, and emits completion events.

### 5. Redis Integration

Redis can be introduced for product caching, session data, rate limiting, and cart caching.

````text
Client ──► API Gateway ──► Redis ──┬──► Cache Hit (Response)
                                   │
                                   └──► Cache Miss ──► Product DB
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
````

### 6. Redis-Based Distributed Locking

#### API Endpoints

| Method | Endpoint      |   Auth   | Description                 | Status Code |
| :----- | :------------ | :------: | :-------------------------- | :---------: |
| `POST` | `/api/v1/`    | Customer | Authorize payment for order |  `200 OK`   |
| `GET`  | `/api/v1/:id` | Customer | Get payment audit record    |  `200 OK`   |

## Inventory reservation can become more robust under extremely high concurrency using distributed locking.

```text
Order ──► Redis Lock ──► Inventory Update ──► Release Lock
```

## 🧪 End-to-End Testing Walkthrough with cURL

### 7. Observability

Follow this step-by-step sequence to test the entire distributed workflow through the API Gateway (`http://localhost:5014`).

Introduce centralized observability using Prometheus, Grafana, OpenTelemetry, and Jaeger to monitor request latency, error rates, and queue depth.

### 1. User Registration & Authentication

````bash
# Register Admin User
curl -X POST http://localhost:5014/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "Admin User",
    "email": "admin@ecommerce.com",
    "password": "Password123!",
    "role": "admin"
  }'

### 8. Distributed Tracing & 9. Correlation IDs
# Sign In & Save Token
TOKEN=$(curl -s -X POST http://localhost:5014/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ecommerce.com",
    "password": "Password123!",
    "role": "admin"
  }' | jq -r '.data.token')

A single ecommerce request can travel through many services. Adding a `correlationId` to every request/event makes debugging distributed workflows significantly easier.

```text
API Gateway ──► Order Service ──► RabbitMQ ──► Inventory Service ──► Payment Service
echo "Auth Token: $TOKEN"
````

### 10. API Rate Limiting

### 2. Catalog Creation (Product Service)

```bash
PRODUCT_ID=$(curl -s -X POST http://localhost:5014/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Sony WH-1000XM5 Wireless Headphones",
    "description": "Industry-leading noise canceling wireless headphones",
    "price": 399.99,
    "category": "Electronics",
    "brand": "Sony",
    "images": ["https://images.example.com/sony-xm5.jpg"]
  }' | jq -r '.data._id')

Add rate limiting at the API Gateway (e.g., 100 requests / minute / user) using a Redis Rate Limiter.
echo "Created Product ID: $PRODUCT_ID"
```

### 11. Kubernetes (K8s) Deployment

### 3. Stock Initialization (Inventory Service)

```bash
curl -X POST http://localhost:5016/api/v1/inventory \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 50
  }"
```

Deploy Dockerized services using Kubernetes with Horizontal Pod Autoscaling (HPA).

````text
Kubernetes Cluster
│
├── API Gateway
├── Auth Service
├── Product Service
├── Cart Service
├── Order Service
├── Inventory Service
├── Payment Service
└── RabbitMQ
### 4. Add Product to Shopping Cart (Cart Service)
```bash
curl -X POST http://localhost:5014/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 2
  }"
````

### 12. CI/CD Pipelines

### 5. Submit Order (Order Service ➔ RabbitMQ `ORDER_CREATED`)

````bash
ORDER_ID=$(curl -s -X POST http://localhost:5014/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "deliveryAddress": "221B Baker Street, London, NW1 6XE"
  }' | jq -r '.data._id')

Implement GitHub Actions for automated deployment.
echo "Placed Order ID: $ORDER_ID"

```text
Git Push ──► Run Tests ──► Lint ──► Build Docker Image ──► Push Image ──► Deploy
# Inspect Order Status (Transitions to READY_FOR_PAYMENT via RabbitMQ)
sleep 1
curl -X GET "http://localhost:5014/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
````

### 13. Automated Testing

### 6. Process Payment (Payment Service ➔ RabbitMQ `PAYMENT_SUCCESS` ➔ `ORDER_CONFIRMED`)

````bash
curl -X POST http://localhost:5014/api/v1/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"paymentMethod\": \"CARD\"
  }"

Add Unit, Integration, and full End-to-End Tests for the complete lifecycle:
# Verify Order is CONFIRMED
sleep 1
curl -X GET "http://localhost:5014/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"

```text
Create User ──► Create Product ──► Create Inventory ──► Create Order ──► Reserve Inventory ──► Payment ──► Confirm Order ──► Confirm Inventory ──► Clear Cart
# Verify Cart has been automatically cleared by event consumer
curl -X GET http://localhost:5014/api/v1/cart \
  -H "Authorization: Bearer $TOKEN"
````

### 14. API Documentation

Add OpenAPI / Swagger documentation (`/api-docs`) for all endpoints.

### 15. Secrets Management

Move production secrets away from `.env` to a secure manager like AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets.

### 16. Database Improvements

Proper indexes, query optimization, MongoDB replica sets, read replicas, and automated backups.

---

## 🛠️ Development Roadmap

## 🐳 Docker & Container Orchestration

### Phase 1 — Core Services

The platform provides a complete `docker-compose.yml` orchestrating all 7 microservices, MongoDB instances, and the RabbitMQ cluster.

- Auth, Product, Cart, Order, Inventory, Payment Services.

```bash
# Start all microservices in detached mode with build
docker compose up -d --build

### Phase 2 — Event-Driven Architecture
# View real-time logs across all services
docker compose logs -f

- RabbitMQ setup, `ORDER_CREATED`, Inventory reservation, `PAYMENT_SUCCESS`, `ORDER_CONFIRMED`, Event-driven cart cleanup.
# Check container health status
docker compose ps

### Phase 3 — Containerization
# Teardown containers and volumes
docker compose down -v
```

- Dockerfiles, Docker Compose optimization, Health checks, Production configuration.

### Health Check & Startup Order

- RabbitMQ includes an active health check ping (`rabbitmq-diagnostics -q ping`).
- Dependent services (`cart-service`, `order-service`, `payment-service`, `inventory-service`) wait for RabbitMQ health (`condition: service_healthy`).
- `api-gateway` starts after all 6 microservices have initialized.

### Phase 4 — Reliability

- Dead Letter Queues, Retry policies, Correlation IDs, Automatic RabbitMQ reconnection, Idempotency keys, Saga orchestration/choreography.

### Phase 5 — Observability

- Prometheus, Grafana, OpenTelemetry, Distributed tracing, Centralized logging.

### Phase 6 — Production Deployment

- CI/CD, Kubernetes, Horizontal Pod Autoscaling, Secrets management, Cloud deployment, Production MongoDB & RabbitMQ.

---

## ⭐ Future Vision

## ⚙️ Environment Variables Reference

The long-term goal is to evolve this project into a production-grade ecommerce platform incorporating event sourcing, CQRS, and advanced service integration.
| Variable Name | Required By Services | Description | Sample Value |
| :--- | :--- | :--- | :--- |
| `PORT` | All Services | HTTP listening port for the service | `5014`, `5011`, `5009`, `5010`, `5012`, `5016`, `5013` |
| `MONGO_URL` | Auth, Product, Cart, Order, Inventory, Payment | MongoDB connection URI | `mongodb://localhost:27017/ecommerce_order` |
| `SECRET_TOKEN` / `JWT_SECRET` | Auth, Cart, Order, Inventory, Payment | Symmetric secret used to sign & verify JWTs | `super_secret_jwt_key_32_chars` |
| `EXPIRES_IN` | Auth Service | Token validity duration | `1d`, `7d` |
| `RABBITMQ_URL` | Cart, Order, Inventory, Payment | AMQP connection URI for RabbitMQ broker | `amqp://rabbitmq:5672` |
| `EXCHANGE_NAME` | Cart, Order, Inventory, Payment | RabbitMQ topic exchange name | `ecommerce_events` |
| `AUTH_SERVICE_URL` | API Gateway | Base URL for Auth Service | `http://auth-service:5011` |
| `PRODUCT_SERVICE_URL` | API Gateway, Cart, Order, Inventory | Base URL for Product Service | `http://product-service:5009` |
| `CART_SERVICE_URL` | API Gateway, Order | Base URL for Cart Service | `http://cart-service:5010` |
| `ORDER_SERVICE_URL` | API Gateway, Payment, Inventory | Base URL for Order Service | `http://order-service:5012` |
| `PAYMENT_SERVICE_URL`| API Gateway | Base URL for Payment Service | `http://payment-service:5013` |
| `INVENTORY_SERVICE_URL`| API Gateway | Base URL for Inventory Service | `http://inventory-service:5016` |

## <<<<<<< HEAD

=======

```text
                    ┌─────────────────────┐
                    │     API Gateway     │
                    └──────────┬──────────┘
                               │
       ┌───────────────────────┼────────────────────────┐
       │                       │                        │
       ▼                       ▼                        ▼
    Auth                 Product                     Cart
       │                       │                        │
       └───────────────────────┼────────────────────────┘
                               │
                               ▼
                            Order
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
                Inventory              Payment
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
                           RabbitMQ
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
    Notification           Analytics            Search
          │                    │                    │
          ▼                    ▼                    ▼
      Email/SMS             Metrics             Elasticsearch
```

---

## 🔮 Production Roadmap & Distributed Patterns

## 🎯 Design Principles Highlight

- [ ] **Choreographed / Orchestrated Saga Pattern**: Extend `PAYMENT_FAILED` event handling to automatically trigger `RELEASE_INVENTORY` and `CANCEL_ORDER`.
- [ ] **Dead Letter Queues (DLQ) & Retry Policy**: Configure RabbitMQ DLX exchanges with exponential backoff (e.g. 3 retries ➔ DLQ) for failed message handling.
- [ ] **Redis Distributed Caching & Redlock**: Integrate Redis for caching product catalog read operations and distributed locking for flash sale inventory contention.
- [ ] **Distributed Tracing & Correlation IDs**: Inject `x-correlation-id` at API Gateway and propagate through HTTP headers and RabbitMQ message properties.
- [ ] **API Rate Limiting**: Implement token-bucket rate limiting at API Gateway (e.g. 100 req/min per IP/token) via Redis.
- [ ] **Kubernetes Deployment**: Kubernetes Helm charts with Horizontal Pod Autoscaling (HPA) and NGINX Ingress Controller.
- [ ] **Automated Testing Suite**: Jest unit tests, Supertest API tests, and Testcontainers-based RabbitMQ integration tests.

- **Single Responsibility:** Each service owns a specific business capability.
- **Database Ownership:** A service should never directly access another service's database.
- **Loose Coupling:** Services communicate through APIs and events rather than sharing implementation details.
- **Failure Isolation:** A failure in one service (e.g., Payment) does not automatically bring down the entire system.
- **Independent Scalability:** Services can be horizontally scaled independently based on traffic demands.

---

## 👨‍💻 Author

## 👨‍💻 Author & License

**Krishu Kumar**  
Indian Institute of Information Technology (IIIT), Ranchi  
_Interested in: Backend Engineering, Distributed Systems, Microservices, Generative AI, Agentic AI, and System Design._
_Specializing in Backend Engineering, Distributed Systems, Microservices & Cloud Architecture_

- GitHub: [krishu2814](https://github.com/krishu2814)
- Email: [krishukumarsingh06@gmail.com](mailto:krishukumarsingh06@gmail.com)
- **GitHub**: [@krishu2814](https://github.com/krishu2814)
- **LinkedIn**: [Krishu Kumar](https://linkedin.com/in/krishu2814)
- **Email**: [krishukumarsingh06@gmail.com](mailto:krishukumarsingh06@gmail.com)

---

_This project is intended for educational, portfolio, and experimentation purposes. Licensed under the MIT License._

> > > > > > > 476dfe0 (feat(inventory): implement event-driven reservation and order confirmation flow)
> > > > > > > _Licensed under the [MIT License](LICENSE)._
