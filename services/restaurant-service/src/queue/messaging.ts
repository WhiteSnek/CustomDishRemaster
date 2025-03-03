import amqp from 'amqplib'
import { generateCorrelationId } from 'src/utils/CorrelationId';

export const sendOtpRequest = async (email: string) => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();
    
        const requestQueue = 'send_otp';
        await channel.assertQueue(requestQueue, { durable: true });
    
        // Send request to the messaging service to send OTP
        const otpRequest = { email, userType: "restaurant" };
        channel.sendToQueue(requestQueue, Buffer.from(JSON.stringify(otpRequest)));
    
        console.log(`OTP request sent for ${email}`);
        await channel.close();
        await connection.close();
    } catch (error: any) {
        throw new Error(error.message)
    }
};

export const verifyOtpRequest = async (email: string, otp: number) => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();
    
        const requestQueue = 'verify_otp';
        const responseQueue = 'verify_otp_response'
        await channel.assertQueue(requestQueue, { durable: true });
        await channel.assertQueue(responseQueue, { durable: true })
        const correlationId = generateCorrelationId();
        const otpRequest = { email, otp };
    
        const responsePromise = new Promise((resolve, reject) => {
            channel.consume(
                responseQueue,
                (msg) => {
                    if (msg && msg.properties.correlationId == correlationId) {
                        const response = JSON.parse(msg.content.toString());
                        channel.ack(msg)
                        resolve(response)
                    }
                },
                { noAck: false }
            )
            setTimeout(() => {
                reject(new Error("Token generation timed out"))
            }, 5000)
        })
    
        channel.sendToQueue(requestQueue, Buffer.from(JSON.stringify(otpRequest)), {
            correlationId,
            replyTo: responseQueue
        })
    
        const response = await responsePromise;
    
        await channel.close();
        await connection.close();
        return response as {status: boolean, message: string};
    } catch (error: any) {
        throw new Error(error.message)
    }
}

export const sendNewDeviceLoginMail = async(email: string, name: string, deviceInfo: Object) => {
    try {
        console.log(name)
        const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();
    
        const requestQueue = 'send_new_device_mail';
        await channel.assertQueue(requestQueue, { durable: true });
    
        // Send request to the messaging service to send OTP
        const message = {
            email,
            name,
            deviceInfo
        }
        channel.sendToQueue(requestQueue, Buffer.from(JSON.stringify(message)));
    
        console.log(`Mail sent to ${email}`);
        await channel.close();
        await connection.close();
    } catch (error: any) {
        throw new Error(error.message)
    }
}