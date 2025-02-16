import amqp from "amqplib";
import dotenv from "dotenv";
import connectDb from "./config";
import { generateTokens, refreshTokens, revokeToken, restoreToken } from "./controller";

dotenv.config({
    path: "./.env",
});

const startTokenService = async (): Promise<void> => {
    try {
        // Connect to MongoDB
        await connectDb();

        // Connect to RabbitMQ
        const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();

        // Define queues
        const generateRequestQueue = "generate_tokens";
        const refreshRequestQueue = "refresh_tokens";
        const revokeQueue = "revoke_token";
        const restoreQueue = "restore_token";

        // Ensure queues exist
        await channel.assertQueue(generateRequestQueue, { durable: true });
        await channel.assertQueue(refreshRequestQueue, { durable: true });
        await channel.assertQueue(revokeQueue, { durable: true });
        await channel.assertQueue(restoreQueue, { durable: true });

        // Generate Tokens Consumer
        channel.consume(
            generateRequestQueue,
            async (msg) => {
                if (!msg) return;

                try {
                    const { userId, userType, deviceInfo, ipAddress } = JSON.parse(msg.content.toString());
                    const response = await generateTokens(userId, userType, deviceInfo, ipAddress);
                    channel.sendToQueue(
                        msg.properties.replyTo,
                        Buffer.from(JSON.stringify(response)),
                        { correlationId: msg.properties.correlationId }
                    );
                    channel.ack(msg);
                } catch (error: any) {
                    console.error("Error processing generateTokens:", error.message);
                    channel.nack(msg, false, false);
                }
            },
            { noAck: false }
        );

        // Refresh Tokens Consumer
        channel.consume(
            refreshRequestQueue,
            async (msg) => {
                if (!msg) return;

                try {
                    const { userId, userType } = JSON.parse(msg.content.toString());
                    const response = await refreshTokens(userId, userType);
                    channel.sendToQueue(
                        msg.properties.replyTo,
                        Buffer.from(JSON.stringify(response)),
                        { correlationId: msg.properties.correlationId }
                    );
                    channel.ack(msg);
                } catch (error: any) {
                    console.error("Error processing refreshTokens:", error.message);
                    channel.nack(msg, false, false);
                }
            },
            { noAck: false }
        );

        // Revoke Token Consumer
        channel.consume(
            revokeQueue,
            async (msg) => {
                if (!msg) return;

                try {
                    const { userId, userType } = JSON.parse(msg.content.toString());
                    const response = await revokeToken(userId, userType);
                    channel.sendToQueue(
                        msg.properties.replyTo,
                        Buffer.from(JSON.stringify({ success: response })),
                        { correlationId: msg.properties.correlationId }
                    );
                    channel.ack(msg);
                } catch (error: any) {
                    console.error("Error processing revokeToken:", error.message);
                    channel.nack(msg, false, false);
                }
            },
            { noAck: false }
        );

        // Restore Token Consumer
        channel.consume(
            restoreQueue,
            async (msg) => {
                if (!msg) return;

                try {
                    const { userId, userType } = JSON.parse(msg.content.toString());
                    const response = await restoreToken(userId, userType);
                    channel.sendToQueue(
                        msg.properties.replyTo,
                        Buffer.from(JSON.stringify({ success: response })),
                        { correlationId: msg.properties.correlationId }
                    );
                    channel.ack(msg);
                } catch (error: any) {
                    console.error("Error processing restoreToken:", error.message);
                    channel.nack(msg, false, false);
                }
            },
            { noAck: false }
        );

        console.log("Token Service is running and listening to queues...");

    } catch (error: any) {
        console.error("Error starting Token Service:", error.message);
    }
};

startTokenService();
