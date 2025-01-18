import { Router } from "express";

import { loginUser, registerUser, logoutUser, getCurrentCustomer, updatePassword, deactivateAccount, deleteAccount, addAddress, deleteAddress, sendOtp } from "../controller";
import { verifyToken } from "../middleware/auth.middleware";
import { upload } from "../middleware/multer.middleware";
const router = Router()

router.route('/login').post(loginUser);
router.route('/sendOtp').post(sendOtp);
router.route('/register').post(upload.single('displayImage'), registerUser);
router.route('/logout').post(verifyToken, logoutUser);
router.route('/current-customer').get(verifyToken, getCurrentCustomer);
router.route('/update-password').patch(updatePassword)
router.route('/deactivate').patch(verifyToken, deactivateAccount)
router.route('/delete').delete(verifyToken, deleteAccount)
router.route('/add-address').patch(verifyToken, addAddress)
router.route('/delete-address').patch(verifyToken, deleteAddress)


export default router;