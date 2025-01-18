import amqp from "amqplib";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { RefreshToken } from "./models";
import connectDb from "./config";

dotenv.config({
    path: "./.env",
});

const startTokenService = async (): Promise<void> => {
    try {
        // Connect to MongoDB
        await connectDb();

        const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();

        const requestQueue = "generate_tokens";

        await channel.assertQueue(requestQueue, { durable: true });

        channel.consume(
            requestQueue,
            async (msg) => {
                if (!msg) return;

                try {
                    const { userId, userType, deviceInfo, ipAddress } = JSON.parse(msg.content.toString());

                    // Generate tokens
                    const accessToken = generateAccessToken(userId, userType);

                    const checkExistingEntry = await RefreshToken.findOne({ userId, userType });
                    let refreshToken: string;
                    let newDeviceLogin = false;

                    if (!checkExistingEntry) {
                        // New entry
                        refreshToken = generateRefreshToken(userId, userType);
                        const token = await RefreshToken.create({
                            userId,
                            userType,
                            deviceInfo: [deviceInfo],
                            ipAddress,
                            token: refreshToken,
                        });

                        if (!token) throw new Error("Error saving refresh token in the database");
                    } else {
                        // Existing entry
                        if (!checkExistingEntry.deviceInfo.includes(deviceInfo)) {
                            newDeviceLogin = true;
                            checkExistingEntry.deviceInfo.push(deviceInfo);
                            await checkExistingEntry.save();
                        }
                        refreshToken = checkExistingEntry.token;
                    }

                    // Send the response
                    const response = { accessToken, refreshToken, newDeviceLogin };
                    channel.sendToQueue(
                        msg.properties.replyTo,
                        Buffer.from(JSON.stringify(response)),
                        { correlationId: msg.properties.correlationId }
                    );

                    channel.ack(msg);
                } catch (error: any) {
                    console.error("Error processing message:", error.message);
                    channel.nack(msg, false, false); // Reject the message without requeuing
                }
            },
            { noAck: false }
        );

        console.log("Token Service is running...");
    } catch (error: any) {
        console.error("Error starting Token Service:", error.message);
        // Retry logic or other actions can be added here if necessary
    }
};

const generateAccessToken = (userId: string, userType: string): string => {
    try {
        const secret = process.env.ACCESS_TOKEN_SECRET;
        if (!secret) {
            throw new Error("ACCESS_TOKEN_SECRET is not defined in environment variables");
        }

        return jwt.sign(
            { userId, userType },
            secret,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );
    } catch (error: any) {
        console.error("Error generating access token:", error.message);
        throw error;
    }
};

const generateRefreshToken = (userId: string, userType: string): string => {
    try {
        const secret = process.env.REFRESH_TOKEN_SECRET;
        if (!secret) {
            throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
        }

        return jwt.sign(
            { userId, userType },
            secret,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
        );
    } catch (error: any) {
        console.error("Error generating refresh token:", error.message);
        throw error;
    }
};

startTokenService();
