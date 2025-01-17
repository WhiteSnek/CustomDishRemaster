import { Router } from "express";

import { loginUser, sendOtp } from "../controller";

const router = Router()

router.route('/login').post(loginUser);
router.route('/sendOtp').post(sendOtp);

export default router;