const { connectRabbitMQ, getChannel } = require("../config/rabbitmq");
const { EXCHANGE_NAME, DLX_EXCHANGE_NAME } = require("../config/serverConfig");

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

/**
 * Creates resilient consumer with 3-stage exponential backoff delay queues and DLQ.
 */
async function startConsumer({ queueName, routingKey, handler }) {
  let channel = getChannel();
  if (!channel) {
    const res = await connectRabbitMQ();
    channel = res.channel;
  }

  const dlqQueueName = `${queueName}_dlq`;
  const dlqRoutingKey = `${queueName}.dlq`;

  // 1. Assert Dead Letter Queue (DLQ)
  await channel.assertQueue(dlqQueueName, {
    durable: true,
  });
  await channel.bindQueue(dlqQueueName, DLX_EXCHANGE_NAME, dlqRoutingKey);

  // 2. Assert multi-stage Retry Delay Queues with message TTL
  for (const delayMs of RETRY_DELAYS_MS) {
    const retryQueueName = `${queueName}_retry_${delayMs}ms`;
    await channel.assertQueue(retryQueueName, {
      durable: true,
      arguments: {
        "x-message-ttl": delayMs,
        "x-dead-letter-exchange": EXCHANGE_NAME,
        "x-dead-letter-routing-key": routingKey,
      },
    });
  }

  // 3. Assert Primary Service Queue with fallback to DLX
  await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": DLX_EXCHANGE_NAME,
      "x-dead-letter-routing-key": dlqRoutingKey,
    },
  });

  await channel.bindQueue(queueName, EXCHANGE_NAME, routingKey);

  console.log(`[Notification Consumer] Resilient queue bound: ${queueName} -> ${routingKey} (DLQ: ${dlqQueueName})`);

  channel.consume(
    queueName,
    async (message) => {
      if (!message) return;

      const headers = message.properties.headers || {};
      const retryCount = Number(headers["x-retry-count"] || 0);

      let data = null;
      try {
        data = JSON.parse(message.content.toString());
      } catch (e) {
        data = {};
      }

      const correlationId =
        message.properties.correlationId ||
        headers["x-correlation-id"] ||
        data?.correlationId ||
        "corr_unknown";

      data.correlationId = data.correlationId || correlationId;

      try {
        await handler(data, message);
        channel.ack(message);
        console.log(`[${correlationId}] [Notification Consumer] Successfully processed ${routingKey} on ${queueName}`);
      } catch (error) {
        console.error(
          `[${correlationId}] [Notification Consumer Error] Error processing ${routingKey} on ${queueName}: ${error.message}`,
        );

        if (retryCount < MAX_RETRIES) {
          const nextRetry = retryCount + 1;
          const delayMs = Math.pow(2, nextRetry - 1) * 1000;
          const retryQueueName = `${queueName}_retry_${delayMs}ms`;

          try {
            channel.sendToQueue(retryQueueName, message.content, {
              persistent: true,
              contentType: "application/json",
              correlationId,
              headers: {
                ...headers,
                "x-correlation-id": correlationId,
                "x-retry-count": nextRetry,
                "x-original-queue": queueName,
                "x-error-message": error.message,
                "x-retry-timestamp": new Date().toISOString(),
              },
            });

            console.warn(
              `[${correlationId}] [Notification Retry ${nextRetry}/${MAX_RETRIES}] Scheduled retry in ${delayMs}ms via ${retryQueueName}`,
            );
            channel.ack(message);
          } catch (retryErr) {
            console.error(`[${correlationId}] [Notification Retry Failure] Routing directly to DLQ:`, retryErr.message);
            routeToDLQ(channel, message, queueName, dlqRoutingKey, error, retryCount, correlationId);
            channel.ack(message);
          }
        } else {
          routeToDLQ(channel, message, queueName, dlqRoutingKey, error, retryCount, correlationId);
          channel.ack(message);
        }
      }
    },
    { noAck: false },
  );
}

function routeToDLQ(channel, message, queueName, dlqRoutingKey, error, retryCount, correlationId) {
  const headers = message.properties.headers || {};
  const corrId = correlationId || message.properties.correlationId || headers["x-correlation-id"] || "corr_unknown";

  channel.publish(
    DLX_EXCHANGE_NAME,
    dlqRoutingKey,
    message.content,
    {
      persistent: true,
      contentType: "application/json",
      correlationId: corrId,
      headers: {
        ...headers,
        "x-correlation-id": corrId,
        "x-retry-count": retryCount,
        "x-original-queue": queueName,
        "x-error-message": error ? error.message : "Max retries exhausted",
        "x-failed-at": new Date().toISOString(),
      },
    },
  );

  console.error(
    `[${corrId}] [Notification DLQ] Poison message from ${queueName} parked in DLQ (${dlqRoutingKey}). Reason: ${error ? error.message : "Unknown error"}`,
  );
}

module.exports = { startConsumer };
