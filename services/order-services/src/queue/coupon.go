package queue

import (
	"encoding/json"
	"errors"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
)

// Response struct to parse the expected response
type CouponResponse struct {
	Error    *string  `json:"error"`
	Discount float32  `json:"discount"`
	Type     string  `json:"type"`
}

// GetDiscountPrice sends a coupon code and user ID to the queue and waits for a response.
func GetDiscountPrice(CouponCode string, UserId string) (float32, string, error) {
	rabbitMqUrl := os.Getenv("RABBITMQ_URL")
	if rabbitMqUrl == "" {
		rabbitMqUrl = "amqp://localhost"
	}

	// Establish RabbitMQ connection
	conn, err := amqp.Dial(rabbitMqUrl)
	if err != nil {
		log.Println("Failed to connect to RabbitMQ:", err)
		return 0.0, "", err
	}
	defer conn.Close()

	// Open channel
	ch, err := conn.Channel()
	if err != nil {
		log.Println("Failed to open a channel:", err)
		return 0.0, "", err
	}
	defer ch.Close()

	requestQueue := "coupon_discount"

	// Declare request queue
	_, err = ch.QueueDeclare(requestQueue, true, false, false, false, nil)
	if err != nil {
		log.Println("Failed to declare a request queue:", err)
		return 0.0, "", err
	}

	// Generate a unique reply queue for each request
	responseQueue, err := ch.QueueDeclare("", false, false, true, false, nil)
	if err != nil {
		log.Println("Failed to declare a response queue:", err)
		return 0.0, "", err
	}

	correlationID := uuid.New().String()

	requestBody, err := json.Marshal(map[string]string{"coupon": CouponCode, "userId": UserId})
	if err != nil {
		log.Println("Failed to marshal request body:", err)
		return 0.0, "", err
	}

	// Response channel to receive messages
	responseChan := make(chan CouponResponse)

	// Start consuming from the response queue
	go func() {
		msgs, err := ch.Consume(responseQueue.Name, "", true, false, false, false, nil)
		if err != nil {
			log.Println("Failed to consume message from queue:", err)
			close(responseChan)
			return
		}

		for msg := range msgs {
			if msg.CorrelationId == correlationID {
				var response CouponResponse
				if err := json.Unmarshal(msg.Body, &response); err != nil {
					log.Println("Failed to unmarshal response:", err)
					continue
				}
				responseChan <- response
				return
			}
		}
	}()

	// Publish request
	err = ch.Publish(
		"", requestQueue, false, false,
		amqp.Publishing{
			CorrelationId: correlationID,
			ReplyTo:       responseQueue.Name,
			ContentType:   "application/json",
			Body:          requestBody,
		},
	)
	if err != nil {
		log.Println("Failed to push the message to queue:", err)
		return 0.0, "", err
	}

	// Wait for response with timeout
	select {
	case response := <-responseChan:
		if response.Error != nil {
			return 0.0, "", errors.New(*response.Error)
		}
		return response.Discount, response.Type ,nil
	case <-time.After(9 * time.Second):
		return 0.0, "", errors.New("coupon discount request timed out")
	}
}
