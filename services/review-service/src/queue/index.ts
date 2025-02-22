import amqp from 'amqplib'

export const updateRating = async(entityId: string, entityType: string, rating: number) => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();
    
        const requestQueue = `update_${entityType}_rating`;
        await channel.assertQueue(requestQueue, { durable: true });
    
        const message = {
            entityId,
            rating
        }
        channel.sendToQueue(requestQueue, Buffer.from(JSON.stringify(message)));
        await channel.close();
        await connection.close();
    } catch (error: any) {
        throw new Error(error.message)
    }
}
