import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import { addReview, deleteReview, editReview, getDeliveryAgentReviews, getDishReviews, getRestaurantReviews } from "../controller";

const router = Router();

router
  .route("/add")
  .post(verifyToken, addReview);
router.route("/:reviewId").patch(verifyToken, editReview).delete(verifyToken, deleteReview)
router.route("/restaurant/:restaurntId").get(getRestaurantReviews)
router.route("/dish/:dishId").get(getDishReviews)
router.route("/deliveryagent/:deliveryAgentId").get(getDeliveryAgentReviews)

export default router;
