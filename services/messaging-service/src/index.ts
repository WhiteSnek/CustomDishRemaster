import amqp from 'amqplib';
import dotenv from 'dotenv';
import connectDb from './config';
import sendOtp from './functions/sendOtp';

dotenv.config({
    path: './.env'
});

const startMessagingService = async () => {
    try {
        // Connect to the database
        await connectDb();

        // Connect to RabbitMQ
        const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();

        // Ensure the queue exists before consuming messages
        const requestQueue = 'send_otp';
        await channel.assertQueue(requestQueue, { durable: true });

        // Consume messages from the queue
        channel.consume(requestQueue, async (msg) => {
            if (!msg) return;

            try {
                // Call the sendOtp function only when a message is received
                await sendOtp(channel, msg);

                // Acknowledge the message after processing
                channel.ack(msg);
            } catch (error: any) {
                // In case of error, reject the message and requeue it
                console.error("Error processing OTP:", error.message);
                channel.nack(msg, false, true);  // Requeue the message
            }
        });

        console.log("Messaging service is running... Waiting for OTP requests...");
    } catch (error: any) {
        console.error(`Error in messaging service: ${error.message}`);
    }
};

startMessagingService();
