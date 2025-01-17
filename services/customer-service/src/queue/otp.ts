import amqp from 'amqplib'

export const sendOtpRequest = async (email: string) => {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    const channel = await connection.createChannel();
    
    const requestQueue = 'send_otp';
    await channel.assertQueue(requestQueue, { durable: true });

    // Send request to the messaging service to send OTP
    const otpRequest = { email, userType: "customer" };
    channel.sendToQueue(requestQueue, Buffer.from(JSON.stringify(otpRequest)));
    
    console.log(`OTP request sent for ${email}`);
    await channel.close();
    await connection.close();
};
