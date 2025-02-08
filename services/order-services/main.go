package main

import (
	"context"
	"log"
	"order-service/src/config"
	"order-service/src/routes"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	log.SetOutput(os.Stdout)

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found!")
	}

	gin.SetMode(gin.DebugMode)

	client, err := config.ConnectDB()
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}


	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := client.Disconnect(ctx); err != nil {
			log.Fatalf("Error while disconnecting from MongoDB: %v", err)
		}
		log.Println("Disconnected from MongoDB.")
	}()

	r := gin.Default()
	r.Use(gin.Logger())

	routes.Routes(r, client)


	port := ":4001"
	log.Println("Starting server on port", port)


	if err := r.Run(port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
