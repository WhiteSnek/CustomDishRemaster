package routes

import (
	"dish-service/src/controllers"
	"dish-service/src/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func Routes(r *gin.Engine, client *mongo.Client) {
	r.POST("/", middleware.AuthMiddleware(), func(ctx *gin.Context) {
		controllers.AddDish(client, ctx)
	})

	r.GET("/", func(ctx *gin.Context) {
		controllers.GetAllDishes(client, ctx)
	})

	r.GET("/:id", func(ctx *gin.Context) {
		controllers.GetDishDetails(client, ctx)
	})

	r.PATCH("/:id",middleware.AuthMiddleware(), func(ctx *gin.Context) {
		controllers.UpdateDish(client, ctx)
	})

	r.DELETE("/:id",middleware.AuthMiddleware(), func(ctx *gin.Context) {
		controllers.DeleteDish(client, ctx)
	})
}