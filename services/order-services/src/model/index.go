package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	StatusPending        = "Pending"
	StatusConfirmed      = "Confirmed"
	StatusBeingPrepared  = "Being Prepared"
	StatusOutForDelivery = "Out for Delivery"
	StatusDelivered      = "Delivered"
	StatusCancelled      = "Cancelled"
)

type Order struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"`
	CustomerID      primitive.ObjectID `bson:"customer"`
	Orders          []SingleOrder      `bson:"singleOrder"`
	TotalPrice      float32            `bson:"price"`
	PaymentMode     string             `bson:"paymentMode"`
	Status          string             `bson:"status"`
	OrderTime       time.Time          `bson:"orderTime"`
	FulfillmentTime *time.Time         `bson:"fulfillmentTime,omitempty"`
	DeliveryTime    *time.Time         `bson:"deliveryTime,omitempty"`
	Discount        float32            `bson:"discount"`
	CouponCode      string             `bson:"couponCode,omitempty"`
}

type SingleOrder struct {
	RestaurantID   primitive.ObjectID `bson:"restaurant"`
	Price         float32            `bson:"price"`
	DishID        primitive.ObjectID `bson:"dishId"`
	Customizations Customizations    `bson:"customizations"`
}

type Customizations struct {
	Salty        int  `bson:"salty"`
	Spicy        int  `bson:"spicy"`
	ExtraCheese  int  `bson:"extraCheese"`
	Sweetness    int  `bson:"sweetness"`
	Onion        bool `bson:"onion"`
	Garlic       bool `bson:"garlic"`
}
