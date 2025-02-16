import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import controller from "../controller";
import { asyncHandler } from "../utils/AsyncHandler";

const router = Router();

router
  .route("/add")
  .post(verifyToken, asyncHandler(controller.addCoupon.bind(controller)));
router
  .route("/:id")
  .patch(verifyToken, asyncHandler(controller.editCoupon.bind(controller)))
  .get(asyncHandler(controller.getCouponById.bind(controller)))
  .delete(verifyToken, asyncHandler(controller.deleteCoupon.bind(controller)));
router
  .route("/claim/:id")
  .patch(asyncHandler(controller.claimCoupon.bind(controller)));

router.route("/").get(asyncHandler(controller.getCoupons.bind(controller)));

export default router;
