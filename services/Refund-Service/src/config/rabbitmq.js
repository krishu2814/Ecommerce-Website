const amqp = require("amqplib");
const { RABBITMQ_URL, EXCHANGE_NAME } = require("./serverConfig");
const crypto = require("crypto");

let channel;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", {
      durable: true,
    });

    console.log("Refund-Service Connected to RabbitMQ");
  } catch (error) {
    console.error("Failed to connect to RabbitMQ in Refund-Service:", error.message);
  }
};

const publishEvent = async (routingKey, message, options = {}) => {
  if (!channel) {
    console.warn(`RabbitMQ channel not initialized. Event '${routingKey}' logged only.`);
    return;
  }

  try {
    const correlationId =
      options.correlationId ||
      message.correlationId ||
      `amqp_${crypto.randomUUID()}`;

    message.correlationId = correlationId;

    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: "application/json",
        correlationId,
        headers: {
          "x-correlation-id": correlationId,
          ...(options.headers || {}),
        },
      }
    );

    console.log(`[${correlationId}] [Refund-Service] Event published: ${routingKey}`);
  } catch (error) {
    console.error(`Failed to publish event ${routingKey}:`, error);
  }
};

module.exports = {
  connectRabbitMQ,
  publishEvent,
};
