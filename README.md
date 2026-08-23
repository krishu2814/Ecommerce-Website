# 🛒 Ecommerce Microservices Ecosystem

A production-oriented **Full-Stack Ecommerce Backend** built using a **Microservices Architecture**, designed around **independent services, event-driven communication, database-per-service, inventory reservation, payment processing, and asynchronous business workflows**.

The project is designed to demonstrate how a real-world ecommerce platform can be decomposed into independently deployable services while maintaining reliable communication between them.

---

## 📌 Overview

This project implements a distributed ecommerce ecosystem consisting of multiple independent microservices.

**The system supports:**

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

_The architecture is intentionally designed to demonstrate concepts used in production distributed systems rather than building the entire ecommerce application as a single monolithic backend._

## ⚙️ System Design
<img width="1415" height="842" alt="SystemDesignEcommerce" src="https://github.com/user-attachments/assets/58ea588e-2505-4b59-8afd-3194edb8d29b" />



## 🏗️ Architecture

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
```

---

## 🧩 Microservices

The system consists of the following independently deployable services:

| Service               | Responsibility                    | Database | Status         |
| :-------------------- | :-------------------------------- | :------- | :------------- |
| **Auth Service**      | Authentication & authorization    | MongoDB  | ✅ Active      |
| **Product Service**   | Product catalog management        | MongoDB  | ✅ Active      |
| **Cart Service**      | Shopping cart management          | MongoDB  | ✅ Active      |
| **Order Service**     | Orders & lifecycle management     | MongoDB  | ✅ Active      |
| **Inventory Service** | Stock management & reservations   | MongoDB  | ✅ Active      |
| **Payment Service**   | Payment processing workflows      | MongoDB  | 🚧 In Progress |
| **API Gateway**       | Central API entry point & routing | —        | ✅ Active      |

---

## 📦 Service Catalog 
- CLICK on the link below to visit each service and and their detailed explanation.

| Service | Repository | Status |
|--------|------------|--------|
| Auth Service | https://github.com/krishu2814/Auth-Service | ✅ Active |
| Product Service | https://github.com/krishu2814/Product-Service | ✅ Active |
| Cart Service | https://github.com/krishu2814/Cart-Service | ✅ Active |
| Order Service | https://github.com/krishu2814/Order-Service | ✅ Active |
| Payment Service | https://github.com/krishu2814/Payment_Service_EcommerceWebsite | ✅ Active |

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

Distributed systems can deliver the same message more than once. The Inventory Service checks the `(orderId, productId)` compound unique index before creating a reservation. If a duplicate `ORDER_CREATED` event arrives, the service safely returns the existing reservation.

---

## 🗄️ Database-per-Service Pattern

Each service strictly owns its own database. Services **never** directly query another service's database. Communication happens exclusively through REST APIs (synchronous) or RabbitMQ events (asynchronous).

---

## ⚙️ Technology Stack

- **Backend:** Node.js, Express.js, JavaScript, TypeScript
- **Database:** MongoDB, Mongoose
- **Messaging:** RabbitMQ, AMQP (Topic Exchanges)
- **Authentication:** JWT, Bcrypt
- **HTTP Communication:** Axios
- **DevOps:** Docker, Docker Compose, Git, GitHub
- **Architecture Patterns:** Microservices, Event-Driven, API Gateway, Database-per-Service, Saga Concepts

---

## 🚀 Getting Started

### 1. Clone Repository

This parent repository manages individual services as Git submodules.

```bash
git clone --recurse-submodules [https://github.com/krishu2814/Ecommerce-Website.git](https://github.com/krishu2814/Ecommerce-Website.git)
cd Ecommerce-Website
```

### 2. Environment Variables

Each service maintains its own `.env` configuration. Copy the provided `.env.example` in each service to a new `.env` file and update the values.

### 3. Run RabbitMQ (Docker)

RabbitMQ must be running before starting services.

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

_Management UI available at `http://localhost:15672` (guest/guest)_

### 4. Install & Run Services

Navigate to each service directory, install dependencies, and start the development server:

```bash
cd Inventory-Service
npm install
npm run dev
```

---

## 🔮 Future Improvements

This project is designed as a continuously evolving production-style learning project. Some components are intentionally simplified and will be enhanced in the future:

### 1. Real Payment Gateway

Integrate Razorpay, Stripe, or PayPal via webhooks.

```text
Payment Initiated ──► Payment Gateway ──► Webhook ──► Payment Service ──► PAYMENT_SUCCESS
```

### 2. Saga Pattern

The complete order workflow can evolve into a Saga for better distributed transaction management.

```text
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
```

### 3. Dead Letter Queues (DLQs)

Introduce DLQs for every critical event consumer to handle failed messages securely.

```text
Main Queue ──► Consumer ──┬──► Success (ACK)
                          │
                          └──► Failure (NACK) ──► DLQ
```

### 4. Event Retry Strategy

Introduce controlled retries with exponential backoff to prevent excessive load on temporary failures.

```text
Attempt 1 ──► Failed ──► Attempt 2 ──► Failed ──► Attempt 3 ──► Failed ──► DLQ
```

### 5. Redis Integration

Redis can be introduced for product caching, session data, rate limiting, and cart caching.

```text
Client ──► API Gateway ──► Redis ──┬──► Cache Hit (Response)
                                   │
                                   └──► Cache Miss ──► Product DB
```

### 6. Redis-Based Distributed Locking

Inventory reservation can become more robust under extremely high concurrency using distributed locking.

```text
Order ──► Redis Lock ──► Inventory Update ──► Release Lock
```

### 7. Observability

Introduce centralized observability using Prometheus, Grafana, OpenTelemetry, and Jaeger to monitor request latency, error rates, and queue depth.

### 8. Distributed Tracing & 9. Correlation IDs

A single ecommerce request can travel through many services. Adding a `correlationId` to every request/event makes debugging distributed workflows significantly easier.

```text
API Gateway ──► Order Service ──► RabbitMQ ──► Inventory Service ──► Payment Service
```

### 10. API Rate Limiting

Add rate limiting at the API Gateway (e.g., 100 requests / minute / user) using a Redis Rate Limiter.

### 11. Kubernetes (K8s) Deployment

Deploy Dockerized services using Kubernetes with Horizontal Pod Autoscaling (HPA).

```text
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
```

### 12. CI/CD Pipelines

Implement GitHub Actions for automated deployment.

```text
Git Push ──► Run Tests ──► Lint ──► Build Docker Image ──► Push Image ──► Deploy
```

### 13. Automated Testing

Add Unit, Integration, and full End-to-End Tests for the complete lifecycle:

```text
Create User ──► Create Product ──► Create Inventory ──► Create Order ──► Reserve Inventory ──► Payment ──► Confirm Order ──► Confirm Inventory ──► Clear Cart
```

### 14. API Documentation

Add OpenAPI / Swagger documentation (`/api-docs`) for all endpoints.

### 15. Secrets Management

Move production secrets away from `.env` to a secure manager like AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets.

### 16. Database Improvements

Proper indexes, query optimization, MongoDB replica sets, read replicas, and automated backups.

---

## 🛠️ Development Roadmap

### Phase 1 — Core Services

- Auth, Product, Cart, Order, Inventory, Payment Services.

### Phase 2 — Event-Driven Architecture

- RabbitMQ setup, `ORDER_CREATED`, Inventory reservation, `PAYMENT_SUCCESS`, `ORDER_CONFIRMED`, Event-driven cart cleanup.

### Phase 3 — Containerization

- Dockerfiles, Docker Compose optimization, Health checks, Production configuration.

### Phase 4 — Reliability

- Dead Letter Queues, Retry policies, Correlation IDs, Automatic RabbitMQ reconnection, Idempotency keys, Saga orchestration/choreography.

### Phase 5 — Observability

- Prometheus, Grafana, OpenTelemetry, Distributed tracing, Centralized logging.

### Phase 6 — Production Deployment

- CI/CD, Kubernetes, Horizontal Pod Autoscaling, Secrets management, Cloud deployment, Production MongoDB & RabbitMQ.

---

## ⭐ Future Vision

The long-term goal is to evolve this project into a production-grade ecommerce platform incorporating event sourcing, CQRS, and advanced service integration.

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

## 🎯 Design Principles Highlight

- **Single Responsibility:** Each service owns a specific business capability.
- **Database Ownership:** A service should never directly access another service's database.
- **Loose Coupling:** Services communicate through APIs and events rather than sharing implementation details.
- **Failure Isolation:** A failure in one service (e.g., Payment) does not automatically bring down the entire system.
- **Independent Scalability:** Services can be horizontally scaled independently based on traffic demands.

---

## 👨‍💻 Author

**Krishu Kumar**  
Indian Institute of Information Technology (IIIT), Ranchi  
_Interested in: Backend Engineering, Distributed Systems, Microservices, Generative AI, Agentic AI, and System Design._

- GitHub: [krishu2814](https://github.com/krishu2814)
- Email: [krishukumarsingh06@gmail.com](mailto:krishukumarsingh06@gmail.com)

---

_This project is intended for educational, portfolio, and experimentation purposes. Licensed under the MIT License._
