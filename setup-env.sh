#!/bin/bash

# ==============================================================================
# Ecommerce Microservices - One-Click Environment Setup Script
# ==============================================================================
# This script copies .env.example -> .env across all 10 microservices
# so any beginner can start the entire project immediately with Docker!
# ==============================================================================

set -e

echo "🚀 Setting up environment files for Ecommerce Microservices Ecosystem..."
echo ""

SERVICES=(
  "ApiGateway-Service"
  "Auth-Service"
  "Product-Service"
  "Cart-Service"
  "Order-Service"
  "Inventory-Service"
  "Payment-Service"
  "Notification-Service"
  "Review-Service"
  "AI-Service"
)

COUNT=0

for SERVICE in "${SERVICES[@]}"; do
  DIR="services/$SERVICE"
  if [ -d "$DIR" ]; then
    if [ -f "$DIR/.env.example" ]; then
      if [ ! -f "$DIR/.env" ]; then
        cp "$DIR/.env.example" "$DIR/.env"
        echo "  ✅ Created $DIR/.env from template"
      else
        echo "  ℹ️  $DIR/.env already exists (skipping overwrite)"
      fi
      COUNT=$((COUNT + 1))
    else
      echo "  ⚠️  $DIR/.env.example missing!"
    fi
  else
    echo "  ⚠️  Directory $DIR not found!"
  fi
done

echo ""
echo "🎉 Environment setup completed for $COUNT services!"
echo "👉 You can now run: docker compose up --build"
