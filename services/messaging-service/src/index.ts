import amqp from 'amqplib';
import dotenv from 'dotenv';
import connectDb from './config';
import sendOtp from './functions/sendOtp';
import verifyOtp from './functions/verifyOtp';
import sendNewDeviceLoginMail from './functions/sendNewDeviceLoginMail';

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
        const sendOtpQueue = 'send_otp';
        const verifyOtpQueue = 'verify_otp';
        const newDeviceLoginQueue = 'send_new_device_mail'

        await channel.assertQueue(sendOtpQueue, { durable: true });
        await channel.assertQueue(verifyOtpQueue, {durable: true});
        await channel.assertQueue(newDeviceLoginQueue, {durable: true})
        // Consume messages from the queue
        channel.consume(sendOtpQueue, async (msg) => {
            if (!msg) return;

            try {
                // Call the sendOtp function only when a message is received
                await sendOtp(msg);

                // Acknowledge the message after processing
                channel.ack(msg);
            } catch (error: any) {
                // In case of error, reject the message and requeue it
                console.error("Error processing OTP:", error.message);
                channel.nack(msg, false, true);  // Requeue the message
            }
        });

        channel.consume(verifyOtpQueue, async(msg) => {
            if (!msg) return;
            try {
                // Call the sendOtp function only when a message is received
                await verifyOtp(channel, msg);

                // Acknowledge the message after processing
                channel.ack(msg);
            } catch (error: any) {
                // In case of error, reject the message and requeue it
                console.error("Error processing OTP:", error.message);
                channel.nack(msg, false, true);  // Requeue the message
            }
        })

        channel.consume(newDeviceLoginQueue, async (msg) => {
            if (!msg) return;

            try {
                
                await sendNewDeviceLoginMail(msg);

                // Acknowledge the message after processing
                channel.ack(msg);
            } catch (error: any) {
                // In case of error, reject the message and requeue it
                console.error("Error sending new device login mail:", error.message);
                channel.nack(msg, false, true);  // Requeue the message
            }
        });

        console.log("Messaging service is running... Waiting for OTP requests...");
    } catch (error: any) {
        console.error(`Error in messaging service: ${error.message}`);
    }
};

startMessagingService();
