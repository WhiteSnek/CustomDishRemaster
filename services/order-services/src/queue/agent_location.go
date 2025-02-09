package queue

import (
	"errors"
	"log"
	"os"
	"time"

	"encoding/json"
	amqp "github.com/rabbitmq/amqp091-go"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"github.com/google/uuid"
)

type DeliveryAgentLocation struct {
	Latitude float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func GetOrderLocation(deliveryAgentId primitive.ObjectID) (*DeliveryAgentLocation, error){
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

	requestQueue := "delivery_agent_location"
	responseQueue := "delivery_agent_location_response"

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

	request := deliveryAgentId

	requestBody, err := json.Marshal(request)
	failOnError(err, "Failed to marshal request body")

	responseChan := make(chan *DeliveryAgentLocation)

	go func ()  {
		msgs, err := ch.Consume(responseQueue, "", false, false, false, false, nil)
		failOnError(err, "Failed to consume message from queue")
		for msg := range msgs {
			if msg.CorrelationId == correlationID {
				var response DeliveryAgentLocation
				if err := json.Unmarshal(msg.Body, &response); err != nil {
					log.Println("Failed to unmarshal response:", err)
					continue
				}
				ch.Ack(msg.DeliveryTag, false)
				responseChan <- &response
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
		return nil, errors.New("token generation timed out")
	}
}