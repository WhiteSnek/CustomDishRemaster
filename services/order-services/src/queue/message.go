package queue

import "go.mongodb.org/mongo-driver/bson/primitive"

func SendMessageToRestaurant(restaurantId primitive.ObjectID) (string, error) {
	return "hello", nil
}

func SendMessageToPaymentService() (string, error) {
	return "hello", nil
}