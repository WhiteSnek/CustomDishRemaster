import amqp from 'amqplib';
import { DeliveryAgent } from '../models';

export const updateRating = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();

        const requestQueue = 'update_delivery_agent_rating';
        await channel.assertQueue(requestQueue, { durable: true });

        channel.consume(requestQueue, async (msg) => {
            if (!msg) return;

            try {
                const { entityId, rating } = JSON.parse(msg.content.toString());
                await DeliveryAgent.findByIdAndUpdate(entityId,{
                    $set: {
                        rating,
                    }
                })
                channel.ack(msg); 
            } catch (error: any) {
                console.error("Error processing rating update:", error.message);
                channel.nack(msg, false, true);
            }
        });

    } catch (error: any) {
        console.error("RabbitMQ connection error:", error.message);
        throw new Error(error.message);
    }
};
