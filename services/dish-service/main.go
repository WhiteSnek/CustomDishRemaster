package main

import (
	"context"
	"dish-service/src/config"
	"dish-service/src/queue"
	"dish-service/src/routes"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Ensure logs are printed to stdout
	log.SetOutput(os.Stdout)

	// Load .env file (optional)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found!")
	}

	// Enable debug mode in Gin for better logging
	gin.SetMode(gin.DebugMode)

	// Connect to MongoDB
	client, err := config.ConnectDB()
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	go queue.UpdateRating(client)
	// Ensure the database disconnects properly
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := client.Disconnect(ctx); err != nil {
			log.Fatalf("Error while disconnecting from MongoDB: %v", err)
		}
		log.Println("Disconnected from MongoDB.")
	}()
	
	// Initialize Gin router with logging middleware
	r := gin.Default()
	r.Use(gin.Logger())

	routes.Routes(r, client)

	// Sample route
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// Print log message before starting the server
	port := ":4000"
	log.Println("Starting server on port", port)

	// Start the server
	if err := r.Run(port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
