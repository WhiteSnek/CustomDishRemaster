package controller

import (
	"context"
	"log"
	"math/rand"
	"net/http"
	"order-service/src/config"
	"order-service/src/model"
	"order-service/src/queue"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	// "go.mongodb.org/mongo-driver/v2/mongo/options"
)

type SingleOrder struct {
	
	Price          float32            `json:"price"`
	DishID         primitive.ObjectID `json:"dishId"`
	Quantity       int                `json:"quantity"`
	Customizations Customizations     `json:"customizations"`
}

type Customizations struct {
	Salty       int  `json:"salty,omitempty"`
	Spicy       int  `json:"spicy,omitempty"`
	ExtraCheese int  `json:"extraCheese,omitempty"`
	Sweetness   int  `json:"sweetness,omitempty"`
	Onion       bool `json:"onion,omitempty"`
	Garlic      bool `json:"garlic,omitempty"`
}

type CreateOrderInput struct {
	RestaurantID   primitive.ObjectID `json:"restaurant"`
	Orders      []SingleOrder `json:"singleOrder"`
	PaymentMode string        `json:"paymentMode"`
	CouponCode  *string       `json:"couponCode,omitempty"`
}

func GenerateRandomOrderID() int {
	return rand.Intn(900000) + 100000
}

func CreateOrder(client *mongo.Client, c *gin.Context) {
	// check the request body
	var input CreateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// get id of logged in customer
	customerId, exists := c.Get("customerId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	customerIDStr, ok := customerId.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid customer ID"})
		return
	}
	customerObjectID, err := primitive.ObjectIDFromHex(customerIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// create orders array and calculate total price
	var orders []model.SingleOrder
	var totalPrice float32
	for _, o := range input.Orders {
		orders = append(orders, model.SingleOrder{
			
			Price:        o.Price,
			DishID:       o.DishID,
			Quantity:     o.Quantity,
			Customizations: model.Customizations{
				Salty:       o.Customizations.Salty,
				Spicy:       o.Customizations.Spicy,
				ExtraCheese: o.Customizations.ExtraCheese,
				Sweetness:   o.Customizations.Sweetness,
				Onion:       o.Customizations.Onion,
				Garlic:      o.Customizations.Garlic,
			},
		})
		totalPrice += o.Price
	}
	// check for discount if coupon code exists
	var discount float32 = 0.0
	if input.CouponCode != nil {
		discount, err = queue.GetDiscountPrice(*input.CouponCode)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		totalPrice -= discount
	}
	// generate random id for order
	orderId := GenerateRandomOrderID()
	// create entry in database
	newOrder := model.Order{
		OrderId:     orderId,
		RestaurantID: input.RestaurantID,
		CustomerID:  customerObjectID,
		TotalPrice:  totalPrice,
		Orders:      orders,
		PaymentMode: input.PaymentMode,
		CouponCode:  input.CouponCode,
		Status:      model.StatusPending,
		Discount:    discount,
		OrderTime:   time.Now(),
	}
	result, err := config.OrderCollection.InsertOne(context.TODO(), newOrder)
	if err != nil {
		log.Println("Error creating Order:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Order"})
		return
	}
	// send message to the payment service
	data, err := queue.InitiatePayment()
	if err != nil {
		log.Println("Error initiating payment:", err)
	}
	log.Println(data)
	c.JSON(http.StatusCreated, gin.H{"message": "Order created successfully!", "orderId": result.InsertedID})
}


func CancelOrder(client *mongo.Client, c *gin.Context) {
	// get order id from params
	orderId := c.Param("id")
	customerId, exists := c.Get("customerId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	customerIDStr, ok := customerId.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid customer ID"})
		return
	}
	customerObjectID, err := primitive.ObjectIDFromHex(customerIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filter := bson.M{"orderId": orderId}
	var order model.Order
	err = config.OrderCollection.FindOne(context.TODO(), filter).Decode(&order)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	if customerObjectID != order.CustomerID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	// cancel the order
	// send message to the restaurant service.
	// send message to the payment service.
	update := bson.M{"status": model.StatusCancelled}
	updatedResult := config.OrderCollection.FindOneAndUpdate(context.TODO(), filter, bson.M{"$set": update})
	if updatedResult.Err() != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel order"})
        return
    }
	c.JSON(http.StatusOK, gin.H{"message": "Order cancelled successfully!"})
}

func UpdateOrderStatus(client *mongo.Client, c *gin.Context) {
	orderId := c.Param("orderId")
	status := c.Param("status")
	restaurantId, restaurantExists := c.Get("restaurantId")
	deliveryAgentId, deliveryAgentExists := c.Get("deliveryAgent")
	if !restaurantExists && !deliveryAgentExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var order model.Order
	err := config.OrderCollection.FindOne(context.TODO(), bson.M{"orderId": orderId}).Decode(&order)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	if restaurantExists {
		restaurantIDStr, ok := restaurantId.(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid restaurant ID"})
			return
		}
		restaurantObjectID, err := primitive.ObjectIDFromHex(restaurantIDStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if status != model.StatusBeingPrepared && status != model.StatusOutForDelivery {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
			return
		}
		if restaurantObjectID != order.RestaurantID {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return 
		}
		updatedStatus := config.OrderCollection.FindOneAndUpdate(context.TODO(),bson.M{"orderId": orderId}, bson.M{"$set": status})
		if updatedStatus.Err() != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully!"})
		return
	}
	if deliveryAgentExists {
		deliveryAgentIdStr, ok := deliveryAgentId.(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid delivery agent ID"})
			return
		}
		deliveryAgentObjectId, err := primitive.ObjectIDFromHex(deliveryAgentIdStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if status != model.StatusOutForDelivery && status != model.StatusDelivered {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
			return
		}
		if deliveryAgentObjectId != *order.DeliveryAgent {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return 
		}
		updatedStatus := config.OrderCollection.FindOneAndUpdate(context.TODO(),bson.M{"orderId": orderId}, bson.M{"$set": status})
		if updatedStatus.Err() != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully!"})
		return
	}
}

func GetOrder() {}

func TrackOrder() {}
