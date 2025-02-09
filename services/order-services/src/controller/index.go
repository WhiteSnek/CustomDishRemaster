package controller

import (
	"context"
	"log"
	"math/rand"
	"net/http"
	"order-service/src/config"
	"order-service/src/model"
	"order-service/src/queue"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
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
	RestaurantID   primitive.ObjectID `json:"restaurantId"`
	Orders      []SingleOrder `json:"singleOrder"`
	PaymentMode string        `json:"paymentMode"`
	CouponCode  *string       `json:"couponCode,omitempty"`
}

type DeliveryAgentLocation struct {
	AgentId primitive.ObjectID `json:"agentId"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type SingleOrderDetails struct {
	Price          float32            `json:"price"`
	Dish           queue.DishDetails `json:"dish"`
	Quantity       int                `json:"quantity"`
	Customizations model.Customizations     `json:"customizations"`
}

type OrderDetails struct {
	OrderId         int                `json:"orderId"`
	CustomerID      primitive.ObjectID `json:"customerId"`
	Orders          []SingleOrderDetails      `json:"singleOrder"`
	TotalPrice      float32            `json:"price"`
	PaymentMode     string             `json:"paymentMode"`
	Status          string             `json:"status"`
	OrderTime       time.Time          `json:"orderTime"`
	FulfillmentTime *time.Time         `json:"fulfillmentTime,omitempty"`
	DeliveryTime    *time.Time         `json:"deliveryTime,omitempty"`
	Discount        float32            `json:"discount"`
	CouponCode      *string            `json:"couponCode,omitempty"`
	DeliveryAgent 	queue.DeliveryAgentDetails	`json:"deliveryAgent"`
	Restaurant   queue.RestaurantDetails `json:"restaurant"`
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
	if order.Status == model.StatusOutForDelivery || order.Status == model.StatusBeingPrepared {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order cannot be cancelled at this stage"})
		return
	}
	// cancel the order
	//TODO: send message to the restaurant service.
	message, err := queue.SendMessageToRestaurant(order.RestaurantID)
	if err != nil {
		log.Println("Error sending message to restaurant:", err)
	}
	log.Println(message)
	//TODO: send message to the payment service.
	message, err = queue.SendMessageToPaymentService()
	if err != nil {
		log.Println("Error sending message to payment service:", err)
	}
	log.Println(message)
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
	deliveryAgentId, deliveryAgentExists := c.Get("deliveryAgentId")
	if !restaurantExists && !deliveryAgentExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	orderIdInt, err := strconv.Atoi(orderId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}
	var order model.Order
	err = config.OrderCollection.FindOne(context.TODO(), bson.M{"orderId": orderIdInt}).Decode(&order)
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
		updatedStatus := config.OrderCollection.FindOneAndUpdate(context.TODO(),bson.M{"orderId": orderId}, bson.M{"$set": bson.M{"status": status}})
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
		if deliveryAgentObjectId != *order.DeliveryAgentID {
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

func GetOrder(client *mongo.Client, c *gin.Context) {
	orderId := c.Param("orderId")
	orderIdInt, err := strconv.Atoi(orderId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var order model.Order
	err = config.OrderCollection.FindOne(context.TODO(), bson.M{"orderId": orderIdInt}).Decode(&order)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Fetch dish details for each order item
	var enrichedOrders []SingleOrderDetails
	for _, o := range order.Orders {
		dishDetails, err := queue.GetDishDetails(o.DishID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dish details: " + err.Error()})
			return
		}

		enrichedOrders = append(enrichedOrders, SingleOrderDetails{
			Price:          o.Price,
			Dish:           *dishDetails,
			Quantity:       o.Quantity,
			Customizations: o.Customizations,
		})
	}

	// Fetch restaurant details
	restaurant, err := queue.GetRestaurantDetails(order.RestaurantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch restaurant details: " + err.Error()})
		return
	}

	// Fetch delivery agent details (if assigned)
	var deliveryAgent *queue.DeliveryAgentDetails
	if order.DeliveryAgentID != nil {
		deliveryAgent, err = queue.GetAgentDetails(*order.DeliveryAgentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch delivery agent details: " + err.Error()})
			return
		}
	}

	// Create the final response object
	orderResponse := OrderDetails{
		OrderId:         order.OrderId,
		CustomerID:      order.CustomerID,
		Orders:          enrichedOrders,
		TotalPrice:      order.TotalPrice,
		PaymentMode:     order.PaymentMode,
		Status:          order.Status,
		OrderTime:       order.OrderTime,
		FulfillmentTime: order.FulfillmentTime,
		DeliveryTime:    order.DeliveryTime,
		Discount:        order.Discount,
		CouponCode:      order.CouponCode,
		DeliveryAgent:   *deliveryAgent,
		Restaurant:      *restaurant,
	}

	// Return the enriched order details
	c.JSON(http.StatusOK, gin.H{
		"message": "Order fetched successfully!",
		"order":   orderResponse,
	})
}

func GetAllOrders(client *mongo.Client, c *gin.Context) {
	// Extract user type (Restaurant, Delivery Agent, or Customer)
	restaurantId, restaurantExists := c.Get("restaurantId")
	deliveryAgentId, deliveryAgentExists := c.Get("deliveryAgentId")
	customerId, customerExists := c.Get("customerId")

	if !restaurantExists && !deliveryAgentExists && !customerExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Query Filters
	filter := bson.M{}
	if restaurantExists {
		filter["restaurantId"] = restaurantId
	} else if deliveryAgentExists {
		filter["deliveryAgentId"] = deliveryAgentId
	} else if customerExists {
		filter["customerId"] = customerId
	}

	// Additional Filters: Order Status, Payment Mode (if provided)
	if status := c.Query("status"); status != "" {
		filter["status"] = status
	}
	if paymentMode := c.Query("paymentMode"); paymentMode != "" {
		filter["paymentMode"] = paymentMode
	}

	// Pagination Parameters
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10")) // Default: 10 results
	if err != nil || limit < 1 {
		limit = 10
	}
	skip, err := strconv.Atoi(c.DefaultQuery("skip", "0")) // Default: No skipping
	if err != nil || skip < 0 {
		skip = 0
	}

	// Apply Projection to optimize MongoDB query
	projection := bson.M{
		"orderId":        1,
		"customerId":     1,
		"orders":         1,
		"totalPrice":     1,
		"paymentMode":    1,
		"status":         1,
		"orderTime":      1,
		"discount":       1,
		"couponCode":     1,
		"deliveryAgentId": 1,
		"restaurantId":   1,
	}
	findOptions := options.Find().
		SetProjection(projection).
		SetLimit(int64(limit)).
		SetSkip(int64(skip))
	// Fetch orders from MongoDB
	var orders []model.Order
	cur, err := config.OrderCollection.Find(context.TODO(), filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}
	defer cur.Close(context.TODO())

	// Decode MongoDB results
	if err := cur.All(context.TODO(), &orders); err != nil {
		log.Println("Error decoding orders:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode orders"})
		return
	}

	// Fetch dish, restaurant, and delivery agent details from RabbitMQ
	var enrichedOrders []OrderDetails
	for _, order := range orders {
		// Fetch restaurant details
		restaurant, err := queue.GetRestaurantDetails(order.RestaurantID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch restaurant details"})
			return
		}

		// Fetch delivery agent details (if assigned)
		var deliveryAgent queue.DeliveryAgentDetails
		if order.DeliveryAgentID != nil {
			agentDetails, err := queue.GetAgentDetails(*order.DeliveryAgentID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch delivery agent details"})
				return
			}
			deliveryAgent = *agentDetails
		}

		// Fetch dish details for each order item
		var detailedOrders []SingleOrderDetails
		for _, singleOrder := range order.Orders {
			dishDetails, err := queue.GetDishDetails(singleOrder.DishID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dish details"})
				return
			}
			detailedOrders = append(detailedOrders, SingleOrderDetails{
				Price:          singleOrder.Price,
				Dish:           *dishDetails,
				Quantity:       singleOrder.Quantity,
				Customizations: singleOrder.Customizations,
			})
		}

		// Append enriched order details
		enrichedOrders = append(enrichedOrders, OrderDetails{
			OrderId:        order.OrderId,
			CustomerID:     order.CustomerID,
			Orders:         detailedOrders,
			TotalPrice:     order.TotalPrice,
			Status:         order.Status,
			OrderTime:      order.OrderTime,
			DeliveryAgent:  deliveryAgent,
			Restaurant:     *restaurant,
		})
	}

	// Return JSON response
	c.JSON(http.StatusOK, gin.H{
		"message": "Orders fetched successfully",
		"orders":  enrichedOrders,
	})
}

func TrackOrder(client *mongo.Client, c *gin.Context) {
	orderId := c.Param("orderId")
	customerId, exists := c.Get("customerId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized access"})
		return
	}
	customerIdStr, ok := customerId.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid customer ID"})
		return
	} 
	customerObjectId, err := primitive.ObjectIDFromHex(customerIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}
	orderIdInt, err := strconv.Atoi(orderId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}
	var order model.Order
	err = config.OrderCollection.FindOne(context.TODO(), bson.M{"orderId": orderIdInt}).Decode(&order)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	if customerObjectId != order.CustomerID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized access"})
		return
	}
	if order.Status != model.StatusOutForDelivery {
		c.JSON(http.StatusForbidden, gin.H{"error": "Order is not out for delivery"})
		return
	}
	if order.DeliveryAgentID == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Order is not assigned to a delivery agent"})
		return
	}
	var locationDetails *queue.DeliveryAgentLocation
	locationDetails, err = queue.GetOrderLocation(*order.DeliveryAgentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get order location"})
		return
	}

	agentLocation := DeliveryAgentLocation{
		AgentId : *order.DeliveryAgentID,
		Latitude :	locationDetails.Longitude,
		Longitude : locationDetails.Longitude,
		UpdatedAt : locationDetails.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Order location fetched successfully",
		"location": agentLocation,
	})
}
