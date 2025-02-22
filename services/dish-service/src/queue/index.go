package queue

import (
	"context"
	"dish-service/src/config"
	"encoding/json"
	"log"
	"os"
	"time"
	"github.com/streadway/amqp"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// DeliveryAgent represents the MongoDB model
type DeliveryAgent struct {
	ID     string  `bson:"_id"`
	Rating float64 `bson:"rating"`
}

// Message structure from RabbitMQ
type RatingUpdate struct {
	EntityID string  `json:"entityId"`
	Rating   float64 `json:"rating"`
}

func UpdateRating(client *mongo.Client) {

	rabbitMQURL := os.Getenv("RABBITMQ_URL")
	if rabbitMQURL == "" {
		rabbitMQURL = "amqp://localhost"
	}

	conn, err := amqp.Dial(rabbitMQURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open a RabbitMQ channel: %v", err)
	}
	defer ch.Close()

	// Declare the queue
	queueName := "update_dish_rating"
	_, err = ch.QueueDeclare(
		queueName, true, false, false, false, nil,
	)
	if err != nil {
		log.Fatalf("Failed to declare a queue: %v", err)
	}

	msgs, err := ch.Consume(
		queueName, "", false, false, false, false, nil,
	)
	if err != nil {
		log.Fatalf("Failed to consume messages: %v", err)
	}

	log.Println(" [*] Waiting for rating updates...")

	for msg := range msgs {
		var update RatingUpdate
		err := json.Unmarshal(msg.Body, &update)
		if err != nil {
			log.Println("Error decoding message:", err)
			msg.Nack(false, true) 
			continue
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, err = config.DishCollection.UpdateOne(
			ctx,
			bson.M{"_id": update.EntityID},
			bson.M{"$set": bson.M{"rating": update.Rating}},
		)
		cancel()

		if err != nil {
			log.Println("Error updating delivery agent rating:", err)
			msg.Nack(false, true)
			continue
		}
		log.Printf("Updated delivery agent [%s] with rating: %.2f\n", update.EntityID, update.Rating)
		msg.Ack(false)
	}
}
