package model

import "go.mongodb.org/mongo-driver/bson/primitive"

type Dish struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	RestaurantId string `bson:"restaurant"`
	Name string `bson:"name"`
	Description string `bson:"description"`
	Category string `bson:"category"`
	Price int `bson:"price"`
	DisplayImage string `bson:"displayImage"`
	Type string `bson:"type"`
	IsVeg bool `bson:"isVeg"`
	Popularity int `bson:"popularity"`
	Rating 	int `bson:"rating"`
	PreparationTime int `bson:"preparationTime"`
	AvailabilityStatus string `bson:"availabilityStatus"`
	Tags []string `bson:"tags"`
}