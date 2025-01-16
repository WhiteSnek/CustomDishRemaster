import amqp from "amqplib";

const startTokenService = async () => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
  const channel = await connection.createChannel();

  const requestQueue = "generate_tokens";

  await channel.assertQueue(requestQueue, { durable: true });

  channel.consume(
    requestQueue,
    async (msg) => {
      if (!msg) return;

      const { userId, userType } = JSON.parse(msg.content.toString());

      // Generate tokens
      const accessToken = generateAccessToken(userId, userType);
      const refreshToken = generateRefreshToken(userId, userType);

      // Send the response
      const response = { accessToken, refreshToken };
      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(JSON.stringify(response)),
        { correlationId: msg.properties.correlationId }
      );

      channel.ack(msg);
    },
    { noAck: false }
  );

  console.log("Token Service is running...");
};

const generateAccessToken = (userId: string, userType: string) => {
  // Generate access token (e.g., using JWT)
  return `access_token_${userId}_${userType}`;
};

const generateRefreshToken = (userId: string, userType: string) => {
  // Generate refresh token (e.g., using JWT)
  return `refresh_token_${userId}_${userType}`;
};

startTokenService();
