package queue

import (
	"errors"
	"log"
	"os"
	"time"

	"encoding/json"
	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/google/uuid"
)


func GetDiscountPrice(CouponCode string) (float32, error) {
	rabbitMqUrl := os.Getenv("RABBITMQ_URL")
	if rabbitMqUrl == "" {
		rabbitMqUrl = "amqp://localhost"
	}
	conn, err := amqp.Dial(rabbitMqUrl)
	failOnError(err, "Failed to connect to RabbitMQ")
	defer conn.Close()

	ch, err := conn.Channel()
	failOnError(err, "Failed to open a channel")
	defer ch.Close()

	requestQueue := "coupon_discount"
	responseQueue := "coupon_discount_response"

	_, err = ch.QueueDeclare(
		requestQueue,
		true,
		false,
		false,
		false,
		nil,
	)
	failOnError(err, "Failed to declare a request queue")

	_, err = ch.QueueDeclare(
		responseQueue,
		true,
		false,
		false,
		false,
		nil,
	)
	failOnError(err, "Failed to declare a response queue")

	correlationID := uuid.New().String()

	requestBody, err := json.Marshal(map[string]string{"coupon": CouponCode})
	failOnError(err, "Failed to marshal request body")

	responseChan := make(chan float32)

	go func ()  {
		msgs, err := ch.Consume(responseQueue, "", false, false, false, false, nil)
		failOnError(err, "Failed to consume message from queue")
		for msg := range msgs {
			if msg.CorrelationId == correlationID {
				var response float32
				if err := json.Unmarshal(msg.Body, &response); err != nil {
					log.Println("Failed to unmarshal response:", err)
					continue
				}
				ch.Ack(msg.DeliveryTag, false)
				responseChan <- response
				return
			}
		}
	}()

	err = ch.Publish(
		"", requestQueue, false, false,
		amqp.Publishing{
			CorrelationId: correlationID,
			ReplyTo:       responseQueue,
			ContentType:   "application/json",
			Body:          requestBody,
		},
	)
	failOnError(err, "Failed to push the message to queue")

	select {
	case response := <-responseChan:
		return response, nil
	case <-time.After(9 * time.Second):
		return 0.0, errors.New("token generation timed out")
	}
}