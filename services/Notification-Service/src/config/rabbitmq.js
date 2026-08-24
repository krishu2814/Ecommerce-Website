const amqp = require("amqplib");
const { RABBITMQ_URL, EXCHANGE_NAME, DLX_EXCHANGE_NAME } = require("./serverConfig");

let channel = null;
let connection = null;

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Assert primary and Dead Letter exchanges
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    await channel.assertExchange(DLX_EXCHANGE_NAME, "topic", { durable: true });

    console.log("Notification Service connected to RabbitMQ (Exchanges asserted)");
    return { connection, channel };
  } catch (error) {
    console.error("RabbitMQ Connection Failed in Notification Service:", error.message);
    throw error;
  }
};

const getChannel = () => channel;

const publishEvent = async (routingKey, data, options = {}) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }

    const correlationId =
      options.correlationId ||
      data.correlationId ||
      `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const messageBuffer = Buffer.from(JSON.stringify(data));
    channel.publish(EXCHANGE_NAME, routingKey, messageBuffer, {
      persistent: true,
      contentType: "application/json",
      correlationId,
      headers: {
        "x-correlation-id": correlationId,
        ...(options.headers || {}),
      },
    });

    console.log(
      `[${correlationId}] [Notification Publisher] Event published to ${routingKey}`,
    );
  } catch (error) {
    console.error("Failed to publish event in Notification Service:", error.message);
    throw error;
  }
};

module.exports = {
  connectRabbitMQ,
  getChannel,
  publishEvent,
};
