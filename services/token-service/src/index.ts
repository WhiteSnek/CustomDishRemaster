import amqp from "amqplib";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { RefreshToken } from "./models";
import connectDb from "./config";

dotenv.config({
    path: './.env'
});


const startTokenService = async () => {
    // Connect to MongoDB
    try {
        await connectDb();

        const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();

        const requestQueue = "generate_tokens";

        await channel.assertQueue(requestQueue, { durable: true });

        channel.consume(
            requestQueue,
            async (msg) => {
                if (!msg) return;

                const { userId, userType, deviceInfo, ipAddress } = JSON.parse(msg.content.toString());

                // Generate tokens
                const accessToken = generateAccessToken(userId, userType);

                const checkExistingEntry = await RefreshToken.findOne({ userId, userType });
                let refreshToken;
                let newDeviceLogin = false;
                if (!checkExistingEntry) {
                    refreshToken = generateRefreshToken(userId, userType);
                    const token = await RefreshToken.create({
                        userId,
                        userType,
                        deviceInfo,
                        ipAddress,
                        token: refreshToken
                    });

                    if (!token) throw new Error("Error saving refresh token in the database");
                } else {
                    if(checkExistingEntry.deviceInfo !== deviceInfo) newDeviceLogin = true;
                    refreshToken = checkExistingEntry?.token;

                }
                // Send the response
                const response = { accessToken, refreshToken, newDeviceLogin };
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
    } catch (error: any) {
        console.log(error.message)
    }
};

const generateAccessToken = (userId: string, userType: string) => {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
        throw new Error("ACCESS_TOKEN_SECRET is not defined in environment variables");
    }

    const accessToken = jwt.sign(
        { userId, userType },
        secret,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
    return accessToken;
};

const generateRefreshToken = (userId: string, userType: string) => {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
        throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
    }

    const refreshToken = jwt.sign(
        { userId, userType },
        secret,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
    return refreshToken;
};

startTokenService();
