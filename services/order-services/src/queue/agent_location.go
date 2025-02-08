package queue

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func GetOrderLocation(deliveryAgentId primitive.ObjectID) (latitude float64, longitude float64, updatedAt time.Time, error error){
	return 0.0, 0.0, time.Now(), nil
}