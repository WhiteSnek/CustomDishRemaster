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
	// ID              primitive.ObjectID `bson:"_id,omitempty"`
	OrderId         int                `bson:"orderId"`
	CustomerID      primitive.ObjectID `bson:"customer"`
	Orders          []SingleOrder      `bson:"singleOrder"`
	TotalPrice      float32            `bson:"price"`
	PaymentMode     string             `bson:"paymentMode"`
	Status          string             `bson:"status"`
	OrderTime       time.Time          `bson:"orderTime"`
	FulfillmentTime *time.Time         `bson:"fulfillmentTime,omitempty"`
	DeliveryTime    *time.Time         `bson:"deliveryTime,omitempty"`
	Discount        float32            `bson:"discount"`
	CouponCode      *string            `bson:"couponCode,omitempty"`
	DeliveryAgent 	*primitive.ObjectID	`bson:"deliveryAgent, omitempty"`
	RestaurantID   primitive.ObjectID `bson:"restaurant"`
}

type SingleOrder struct {
	Price          float32            `bson:"price"`
	DishID         primitive.ObjectID `bson:"dishId"`
	Quantity       int                `bson:"quantity"`
	Customizations Customizations     `bson:"customizations"`
}

type Customizations struct {
	Salty       int  `bson:"salty, omitempty"`
	Spicy       int  `bson:"spicy, omitempty"`
	ExtraCheese int  `bson:"extraCheese, omitempty"`
	Sweetness   int  `bson:"sweetness, omitempty"`
	Onion       bool `bson:"onion, omitempty"`
	Garlic      bool `bson:"garlic, omitempty"`
}
