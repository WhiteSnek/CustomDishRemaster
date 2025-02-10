import { createClient } from 'redis'

const client = createClient({
    socket: {
        host: 'localhost',
        port: 6379
    }
})

client.on("error", (err) => console.error("Redis client errror: ", err));

(async () => {
    await client.connect()
    console.log("Connected to redis")
}) 

export default client