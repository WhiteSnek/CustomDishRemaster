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

type DishDetails struct {
	Name 	string `json:"dish_name"`
	Image 	string `json:"dish_image"`
	Category string `json:"dish_category"`
	IsVeg	bool `json:"dish_is_veg"`
}

type RestaurantDetails struct {
	Name 	string `json:"restaurant_name"`
	Phone 	string `json:"restaurant_phone"`
	Address string `json:"restaurant_address"`
}

type DeliveryAgentDetails struct {
	Name 	string `json:"delivery_agent_name"`
	Phone 	string `json:"delivery_agent_phone"`
	Image 	string `json:"delivery_agent_image"`
}

func failOnError(err error, msg string) {
	if err != nil {
	  log.Panicf("%s: %s", msg, err)
	}
  }

func GetDishDetails(dishId primitive.ObjectID) (*DishDetails, error) {
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

	requestQueue := "dish_details"
	responseQueue := "dish_details_response"

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

	request := dishId

	requestBody, err := json.Marshal(request)
	failOnError(err, "Failed to marshal request body")

	responseChan := make(chan *DishDetails)

	go func ()  {
		msgs, err := ch.Consume(responseQueue, "", false, false, false, false, nil)
		failOnError(err, "Failed to consume message from queue")
		for msg := range msgs {
			if msg.CorrelationId == correlationID {
				var response DishDetails
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

func GetRestaurantDetails(restaurantId primitive.ObjectID) (*RestaurantDetails, error) {
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

	requestQueue := "restaurant_details"
	responseQueue := "restaurant_details_response"

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

	request := restaurantId

	requestBody, err := json.Marshal(request)
	failOnError(err, "Failed to marshal request body")

	responseChan := make(chan *RestaurantDetails)

	go func ()  {
		msgs, err := ch.Consume(responseQueue, "", false, false, false, false, nil)
		failOnError(err, "Failed to consume message from queue")
		for msg := range msgs {
			if msg.CorrelationId == correlationID {
				var response RestaurantDetails
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

func GetAgentDetails(deliveryAgentId primitive.ObjectID) (*DeliveryAgentDetails, error) {
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

	requestQueue := "delivery_agent_details"
	responseQueue := "delivery_agent_details_response"

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

	responseChan := make(chan *DeliveryAgentDetails)

	go func ()  {
		msgs, err := ch.Consume(responseQueue, "", false, false, false, false, nil)
		failOnError(err, "Failed to consume message from queue")
		for msg := range msgs {
			if msg.CorrelationId == correlationID {
				var response DeliveryAgentDetails
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