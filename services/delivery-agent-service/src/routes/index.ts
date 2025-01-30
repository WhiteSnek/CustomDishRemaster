import { Router } from "express";
import controller from '../controllers'
import { upload } from "../middleware/multer.middleware";
const router = Router()

router.post("/register", upload.fields([
    { name: 'displayImage', maxCount: 1 },
    { name: 'vehicleImage', maxCount: 1 } ]), (req, res) => controller.register(req, res));

export default router