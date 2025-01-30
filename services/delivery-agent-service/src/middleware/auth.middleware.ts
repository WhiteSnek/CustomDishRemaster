import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { DeliveryAgent } from "../models";

interface JWTResponse extends JwtPayload {
    userId: string;
    userType: string;
}

export const verifyToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!process.env.ACCESS_TOKEN_SECRET) {
            throw new Error('ACCESS_TOKEN_SECRET is not defined');
        }
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) return res.status(401).json(new ApiResponse(401, {}, "Unauthorized request"));

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Type guard to check if decodedToken is a JWTResponse
        if (typeof decodedToken === 'object' && decodedToken !== null && 'userId' in decodedToken && 'userType' in decodedToken) {
            const { userId, userType } = decodedToken as JWTResponse;
            if (!userId || !userType) return res.status(401).json(new ApiResponse(401, {}, "Invalid Token"));

            const agent = await DeliveryAgent.findById(userId).select("-password");
            if (!agent) return res.status(401).json(new ApiResponse(401, {}, "Invalid Token"));

            req.agent = agent;
            next();
        } else {
            return res.status(401).json(new ApiResponse(401, {}, "Invalid Token"));
        }
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, error, "Something went wrong"));
    }
});
