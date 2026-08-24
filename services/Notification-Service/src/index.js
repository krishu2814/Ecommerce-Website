const express = require("express");
const { PORT } = require("./config/serverConfig");
const { connectDB } = require("./config/database");
const { connectRabbitMQ } = require("./config/rabbitmq");
const NotificationConsumer = require("./consumer/notification-consumer");
const correlationMiddleware = require("./middleware/correlation-middleware");
const apiRoutes = require("./routes/index");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(correlationMiddleware);

app.use("/api", apiRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", service: "Notification-Service", port: PORT });
});

const startServer = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();

    const consumer = new NotificationConsumer();
    await consumer.start();

    app.listen(PORT, () => {
      console.log(`Notification Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Fatal error starting Notification Service:", error);
    process.exit(1);
  }
};

startServer();
