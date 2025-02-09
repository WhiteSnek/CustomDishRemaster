package config

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var OrderCollection *mongo.Collection

func ConnectDB() (*mongo.Client, error) {
	mongo_uri := os.Getenv("DATABASE_URL")
	if mongo_uri == "" {
		log.Fatal("Database url not found!")
	}
	clientOptions := options.Client().ApplyURI(mongo_uri)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(clientOptions)
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	OrderCollection = client.Database("customDish").Collection("orders")

	log.Println("Connected to MongoDB!")
	return client, nil
}