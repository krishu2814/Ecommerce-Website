require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5019,
  MONGO_URL: process.env.MONGO_URL,
  SECRET_TOKEN: process.env.SECRET_TOKEN,
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || "http://localhost:5012",
  PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL || "http://localhost:5013",
  INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL || "http://localhost:5016",
  RABBITMQ_URL: process.env.RABBITMQ_URL || "amqp://localhost",
  EXCHANGE_NAME: process.env.EXCHANGE_NAME || "ecommerce_events",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || ""
};
