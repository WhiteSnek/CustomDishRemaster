package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

var jwtSecret = []byte(os.Getenv("ACCESS_TOKEN_SECRET"))

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing Authorization Header"})
			c.Abort()
			return
		}

		tokenString := strings.Split(authHeader, "Bearer ")
		if len(tokenString) != 2 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Token Format"})
			c.Abort()
			return
		}

		// Parse token
		token, err := jwt.Parse(tokenString[1], func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Token"})
			c.Abort()
			return
		}

		// Extract restaurantId from token
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Token Claims"})
			c.Abort()
			return
		}
		log.Println(claims)
		userId, exists := claims["userId"].(string)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing user ID in token"})
			c.Abort()
			return
		}
		userType, exists := claims["userType"].(string)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing user type in token"})
			c.Abort()
			return
		}
		if(userType != "restaurant" && userType != "customer" &&  userType != "delivery_agent" ){
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user type in token"})
			c.Abort()
			return
		}
		if userType == "restaurant" {
			c.Set("restaurantId", userId)
		}

		if userType == "customer" {
			c.Set("customerId", userId)
		}
		if userType == "delivery_agent" {
			c.Set("deliveryAgentId", userId)
		}
		c.Next()
	}
}
