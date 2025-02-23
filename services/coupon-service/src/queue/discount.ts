import amqp from "amqplib";
import { Coupon } from "../model";

export const getCouponDiscount = async (): Promise<void> => {
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost"
    );
    const channel = await connection.createChannel();

    // Define queues
    const requestQueue = "coupon_discount";
    const responseQueue = "coupon_discount_response";

    // Ensure queues exist
    await channel.assertQueue(requestQueue, { durable: true });
    await channel.assertQueue(responseQueue, { durable: true });

    console.log("Waiting for messages in", requestQueue);

    // Get coupon code Consumer
    channel.consume(
      requestQueue,
      async (msg) => {
        if (!msg) return;

        try {
          const { coupon, userId } = JSON.parse(msg.content.toString());

          const couponDetail = await Coupon.findOne({ code: coupon });

          let response;
          if (!couponDetail) {
            console.warn(`Coupon ${coupon} not found.`);
            response = {
              error: "Coupon not found",
              discount: null,
              type: null,
            };
          } else if (couponDetail.claimedBy.includes(userId)) {
            console.warn(`User ${userId} already claimed coupon ${coupon}.`);
            response = {
              error: "You have already claimed this coupon",
              discount: null,
              type: null,
            };
          } else {
            await Coupon.findByIdAndUpdate(couponDetail._id, {
              $push: { claimedBy: userId },
            });

            response = {
              error: null,
              discount: couponDetail.value,
              type: couponDetail.couponType,
            };
          }

          // Send response to reply queue
          channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify(response)),
            { correlationId: msg.properties.correlationId }
          );

          channel.ack(msg);
        } catch (error: any) {
          console.error("Error processing getCouponDiscount:", error.message);
          const response = { error: error.message, discount: null, type: null };

          channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify(response)),
            { correlationId: msg.properties.correlationId }
          );

          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );

    // Cleanup connection on exit
    process.on("SIGINT", async () => {
      console.log("Closing RabbitMQ connection...");
      await channel.close();
      await connection.close();
      process.exit(0);
    });
  } catch (error: any) {
    console.error("Error in getCouponDiscount:", error.message);
  }
};
