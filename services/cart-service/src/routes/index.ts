import { Router } from "express";
import { addToCart, clearCart, editCart, getCart } from "../controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router()

router.use(verifyToken)

router.route("/").post(addToCart).get(getCart).delete(clearCart).patch(editCart)

export default router