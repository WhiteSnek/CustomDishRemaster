package controllers

import (
	"context"
	"dish-service/src/config"
	"dish-service/src/model"
	"dish-service/src/utils"
	"log"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type AddDishInput struct {
	Name string `json:"name"`
	Description string `json:"description"`
	Category string `json:"category"`
	Price int `json:"price"`
	Type string `json:"type"`
	IsVeg bool `json:"isVeg"`
	PreparationTime int `json:"preparationTime"`
	AvailabilityStatus string `json:"availabilityStatus"`
	Tags []string `json:"tags"`
}

type GetDishesFilter struct {
	Name               string   `form:"name"`
	Category           string   `form:"category"`
	MaxPrice          *int     `form:"maxPrice"`
	MinPrice          *int     `form:"minPrice"`
	Type               string   `form:"type"`
	IsVeg              *bool    `form:"isVeg"`
	PreparationTime    *int     `form:"preparationTime"`
	AvailabilityStatus string   `form:"availabilityStatus"`
	Tags               []string `form:"tags"`
}
// TODO: Add logic for uploading files
func AddDish(client *mongo.Client, c *gin.Context) {
	var input AddDishInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	restaurantId, exists := c.Get("restaurantId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: No restaurant ID found"})
		return
	}

	restaurantIdStr, ok := restaurantId.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid restaurant ID format"})
		return
	}

	var imageUrl string
	file, fileHeader, err := c.Request.FormFile("displayImage")
	if err == nil {
		defer file.Close()
		imageUrl, err = utils.SaveFile(file,fileHeader,"dish",restaurantIdStr, "dishes")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload image"})
			return
		}
	}

	newDish := model.Dish{
		RestaurantId:      restaurantIdStr,
		Name:              input.Name,
		Description:       input.Description,
		Category:          input.Category,
		Price:             input.Price,
		DisplayImage:      imageUrl, //TODO: add logic to handle files
		Type:              input.Type,
		IsVeg:             input.IsVeg,
		Popularity:        0,
		PreparationTime:   input.PreparationTime,
		AvailabilityStatus: input.AvailabilityStatus,
		Tags:              input.Tags,
	}

	result, err := config.DishCollection.InsertOne(context.TODO(), newDish)
	if err != nil {
		log.Println("Error inserting dish:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add dish"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Dish added successfully!", "dishId": result.InsertedID})

} 


func GetAllDishes(client *mongo.Client, c *gin.Context) {
	var input GetDishesFilter

	// Bind query parameters
	if err := c.ShouldBindQuery(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
		return
	}

	// Default pagination values
	limit := int64(10) // Default limit per page
	page := int64(1)   // Default page number

	// Parse limit and page from query parameters
	if c.Query("limit") != "" {
		if parsedLimit, err := strconv.ParseInt(c.Query("limit"), 10, 64); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}
	if c.Query("page") != "" {
		if parsedPage, err := strconv.ParseInt(c.Query("page"), 10, 64); err == nil && parsedPage > 0 {
			page = parsedPage
		}
	}

	skip := (page - 1) * limit // Calculate offset

	// Build filter criteria
	filter := bson.M{}
	if input.Name != "" {
		filter["name"] = bson.M{"$regex": input.Name, "$options": "i"} // Case-insensitive search
	}
	if input.Category != "" {
		filter["category"] = input.Category
	}
	if input.MaxPrice != nil {
		filter["price"] = bson.M{"$lte": *input.MaxPrice}
	}
	if input.MinPrice != nil {
		if _, exists := filter["price"]; exists {
			filter["price"].(bson.M)["$gte"] = *input.MinPrice
		} else {
			filter["price"] = bson.M{"$gte": *input.MinPrice}
		}
	}
	if input.Type != "" {
		filter["type"] = input.Type
	}
	if input.IsVeg != nil {
		filter["isVeg"] = *input.IsVeg
	}
	if input.PreparationTime != nil {
		filter["preparationTime"] = bson.M{"$lte": *input.PreparationTime}
	}
	if input.AvailabilityStatus != "" {
		filter["availabilityStatus"] = input.AvailabilityStatus
	}
	if len(input.Tags) > 0 {
		filter["tags"] = bson.M{"$in": input.Tags}
	}

	// Projection to return only selected fields
	projection := bson.M{
		"name":         1,
		"displayImage": 1,
		"price":        1,
		"description":  1,
		"category":     1,
		"isVeg":        1,
	}

	// Query dishes with pagination
	findOptions := options.Find().
		SetProjection(projection).
		SetLimit(limit).
		SetSkip(skip)

	cursor, err := config.DishCollection.Find(context.TODO(), filter, findOptions)
	if err != nil {
		log.Println("Error fetching dishes:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dishes"})
		return
	}
	defer cursor.Close(context.TODO())

	var dishes []model.Dish
	if err := cursor.All(context.TODO(), &dishes); err != nil {
		log.Println("Error decoding dishes:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode dishes"})
		return
	}

	// Count total dishes matching filter (for frontend pagination)
	totalCount, err := config.DishCollection.CountDocuments(context.TODO(), filter)
	if err != nil {
		log.Println("Error counting documents:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count dishes"})
		return
	}

	// Return paginated results
	c.JSON(http.StatusOK, gin.H{
		"message":     "Dishes fetched successfully!",
		"dishes":      dishes,
		"totalCount":  totalCount,
		"currentPage": page,
		"totalPages":  int64(math.Ceil(float64(totalCount) / float64(limit))),
	})
}

func GetDishDetails(client *mongo.Client, c *gin.Context) {
    dishId := c.Param("id") 
    objectId, err := primitive.ObjectIDFromHex(dishId)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid dish ID"})
        return
    }

    filter := bson.M{"_id": objectId}

    var dish model.Dish
    err = config.DishCollection.FindOne(context.TODO(), filter).Decode(&dish)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Dish not found"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "Dish fetched successfully!",
        "dish": dish,
    })
}


func UpdateDish(client *mongo.Client, c*gin.Context) {
	dishId := c.Param("id")
	objectId, err := primitive.ObjectIDFromHex(dishId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid dish ID"})
		return
	}
	var input AddDishInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	restaurantId, exists := c.Get("restaurantId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: No restaurant ID found"})
		return
	}
	restaurantIdStr, ok := restaurantId.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid restaurant ID format"})
		return
	}
	filter := bson.M{"_id": objectId}

    var dish model.Dish
    err = config.DishCollection.FindOne(context.TODO(), filter).Decode(&dish)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Dish not found"})
        return
    }

	if restaurantIdStr != dish.RestaurantId {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only update dishes from your restaurant"})
		return
	}

	update := bson.M{}
    if input.Name != "" {
        update["name"] = input.Name
    }
    if input.Description != "" {
        update["description"] = input.Description
    }
    if input.Category != "" {
        update["category"] = input.Category
    }
    if input.Price != 0 {
        update["price"] = input.Price
    }
    if input.Type != "" {
        update["type"] = input.Type
    }
    update["isVeg"] = input.IsVeg
    if input.PreparationTime != 0 {
        update["preparationTime"] = input.PreparationTime
    }
    if input.AvailabilityStatus != "" {
        update["availabilityStatus"] = input.AvailabilityStatus
    }
    if len(input.Tags) > 0 {
        update["tags"] = input.Tags
    }

	// Update the dish document
	updateResult := config.DishCollection.FindOneAndUpdate(context.TODO(), filter, bson.M{"$set": update})

	if updateResult.Err() != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update dish"})
        return
    }
	c.JSON(http.StatusOK, gin.H{"message": "Dish updated successfully!"})
}

func DeleteDish(client *mongo.Client, c*gin.Context) {
	// Get the dish ID from the URL parameter
	dishId := c.Param("id")
	objectId, err := primitive.ObjectIDFromHex(dishId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid dish ID"})
		return
	}
	restaurantId, exists := c.Get("restaurantId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: No restaurant ID found"})
		return
	}
	restaurantIdStr, ok := restaurantId.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid restaurant ID format"})
		return
	}
	filter := bson.M{"_id": objectId}
	var dish model.Dish
    err = config.DishCollection.FindOne(context.TODO(), filter).Decode(&dish)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Dish not found"})
        return
    }

	if restaurantIdStr != dish.RestaurantId {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete dishes from your restaurant"})
		return
	}
	// Delete the dish document
	result := config.DishCollection.FindOneAndDelete(context.TODO(),filter)
	if result.Err() != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete dish"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Dish deleted successfully!"})
}