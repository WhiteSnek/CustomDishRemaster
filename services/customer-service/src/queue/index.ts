import amqp from 'amqplib'

export const generateTokens = async (userId: string, deviceInfo: Object, ipAddress: string) => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost')
        const channel = await connection.createChannel()
    
        const requestQueue = "generate_tokens";
        const responseQueue = "generate_tokens_response";
    
        await channel.assertQueue(requestQueue, {durable: true})
        await channel.assertQueue(responseQueue, {durable: true})
        const correlationId = generateCorrelationId()
    
        const message = {
            userId,
            userType: "customer",
            deviceInfo,
            ipAddress
        }
    
        const responsePromise = new Promise((resolve,reject)=>{
            channel.consume(
                responseQueue,
                (msg) => {
                    if(msg && msg.properties.correlationId == correlationId){
                        const response = JSON.parse(msg.content.toString());
                        channel.ack(msg)
                        resolve(response)
                    }
                },
                {noAck: false}
            )
            setTimeout(()=>{
                reject(new Error("Token generation timed out"))
            }, 5000)
        })
    
        channel.sendToQueue(requestQueue, Buffer.from(JSON.stringify(message)),{
            correlationId,
            replyTo: responseQueue
        })
    
        const response = await responsePromise;
    
      await channel.close();
      await connection.close();
    
      return response as { accessToken: string; refreshToken: string }
    } catch (error: any) {
        throw new Error(error.message)
    }
}


const generateCorrelationId = () => {
    return Math.random().toString(36).substring(7) + Date.now().toString();
  }