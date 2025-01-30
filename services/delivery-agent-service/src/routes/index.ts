import { Router } from "express";
import controller from '../controllers'
import { upload } from "../middleware/multer.middleware";
import { verifyToken } from "../middleware/auth.middleware";
const router = Router()

router.post("/register", upload.fields([
    { name: 'displayImage', maxCount: 1 },
    { name: 'vehicleImage', maxCount: 1 } ]), (req, res) => controller.register(req, res));
router.post("/login",(req,res) => controller.login(req,res))
router.get("/current-agent", verifyToken, (req,res)=>controller.getCurrentAgent(req,res))
router.patch("/update-password", (req,res)=>controller.updatePassword(req,res))
router.patch("/update-profile",verifyToken,(req,res)=>controller.updateAccountDetails(req,res))
router.post("/send-otp", (req,res)=>controller.sendOtp(req,res))
router.post("/logout",verifyToken,  (req,res)=> controller.logout(req,res));

export default router