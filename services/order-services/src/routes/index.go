package routes

import (
	"order-service/src/controller"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func Routes(r *gin.Engine, client *mongo.Client){
	r.POST("/", func(ctx *gin.Context) {
		controller.CreateOrder(client, ctx)
	})

	r.PATCH("/:orderId", func(ctx *gin.Context) {
		controller.CancelOrder(client, ctx)
	})

	r.PATCH("/update/:orderId/:status", func(ctx *gin.Context) {
		controller.UpdateOrderStatus(client, ctx)
	})

	r.GET("/:orderId", func(ctx *gin.Context) {
		controller.GetOrder(client, ctx)
	})

	r.GET("/", func(ctx *gin.Context) {
		controller.GetAllOrders(client, ctx)
	})

	r.GET("/track/:orderId", func(ctx *gin.Context) {
		controller.TrackOrder(client, ctx)
	})
}