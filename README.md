# 🛒 Ecommerce Microservices Ecosystem

## 📌 Overview

A comprehensive, scalable **Full-Stack Ecommerce Ecosystem** built using a **Microservices Architecture**.

This repository acts as the **central orchestrator**, managing multiple independent services using:
- Git Submodules
- npm Workspaces

Each service is fully decoupled with its own database and business logic, enabling:
- Independent scalability
- High availability
- Clean architecture

---

## 🏗️ Architecture Overview

The system consists of five core microservices:

- 🔐 Auth Service → Identity management, JWT, Bcrypt  
- 📦 Product Service → Product catalog & inventory  
- 🛒 Cart Service → Shopping cart management  
- 📝 Order Service → Order lifecycle & history  
- 💳 Payment Service → Payment processing  

---

---

## 📦 Service Catalog

| Service | Repository | Status |
|--------|------------|--------|
| Auth Service | https://github.com/krishu2814/Auth-Service | ✅ Active |
| Product Service | https://github.com/krishu2814/Product-Service | ✅ Active |
| Cart Service | https://github.com/krishu2814/Cart-Service | ✅ Active |
| Order Service | https://github.com/krishu2814/Order-Service | ✅ Active |
| Payment Service | https://github.com/krishu2814/Payment_Service_EcommerceWebsite | 🚧 In Progress |

---

## 🚀 Getting Started

### 1️⃣ Clone Repository (with Submodules)
git clone --recurse-submodules https://github.com/krishu2814/YOUR_PARENT_REPO_NAME.git
cd YOUR_PARENT_REPO_NAME


---

### 2️⃣ Initialize Submodules (if already cloned)
git submodule update --init --recursive


---

### 3️⃣ Install Dependencies
npm install


---

## 🏃 Running the System
---
### ▶️ Run Single Service
npm start -w services/Auth-Service
---

### ▶️ Run All Services
npm run start:all

---

## 🧠 Key Concepts

- Microservices architecture  
- Loose coupling  
- Independent services  
- Central orchestration  
- JWT-based authentication  

---

## 🧪 Best Practices Followed

- ✅ Decoupled databases  
- ✅ npm workspaces  
- ✅ Centralized authentication (JWT)  
- ✅ Clean architecture  
- ✅ Scalable structure  

---