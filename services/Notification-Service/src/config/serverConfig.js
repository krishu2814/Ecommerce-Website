const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5015,
  MONGO_URL: process.env.MONGO_URL || "mongodb://localhost:27017/ecommerce_notification",
  RABBITMQ_URL: process.env.RABBITMQ_URL || "amqp://localhost:5672",
  EXCHANGE_NAME: process.env.EXCHANGE_NAME || "ecommerce_events",
  DLX_EXCHANGE_NAME: process.env.DLX_EXCHANGE_NAME || "ecommerce_dlx",
  JWT_SECRET: process.env.SECRET_TOKEN || process.env.JWT_SECRET || "krishukumar@2814",
  NODE_ENV: process.env.NODE_ENV || "development",
  SMTP_HOST: process.env.SMTP_HOST || "smtp.ethereal.email",
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER || "mock_user@ethereal.email",
  SMTP_PASS: process.env.SMTP_PASS || "mock_pass",
  EMAIL_FROM: process.env.EMAIL_FROM || '"Ecommerce Platform" <no-reply@ecommerce.com>',
};
