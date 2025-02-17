import { asyncHandler } from "../utils/AsyncHandler";
import {Request, Response} from 'express'
import { AddReviewDTO, UpdateReviewDTO } from "../validation";
import { ApiResponse } from "../utils/ApiResponse";
import { ZodError } from "zod";
import { Review } from "../model";

const addReview = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body;
    const owner = req.userId;

    try {
        const validateData = AddReviewDTO.parse(data);
        await Review.create({
            owner,
            ...validateData
        });

        return res.status(201).json(new ApiResponse(201, {}, "Review added successfully"));
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json(new ApiResponse(400, error.errors, "Validation Error!"));
        }
        return res.status(500).json(new ApiResponse(500, {}, "Internal server error!"));
    }
});


const editReview = asyncHandler(async(req: Request, res: Response)=> {
    const data = req.body
    const {reviewId} = req.params
    try {
        const validateData = UpdateReviewDTO.parse(data)
        const check = await Review.findById(reviewId)
        if(!check){
            return res.status(404).json(new ApiResponse(404,{},"Review not found!"));
        }
        const updatedReview = await Review.findByIdAndUpdate(reviewId, validateData, { new: true });
        return res.status(200).json(new ApiResponse(200, updatedReview, "Review updated successfully"));
    } catch (error) {
        if (error instanceof ZodError) {
                return res.status(400).json(new ApiResponse(500, error.errors, "Validation Error!"));
            }
            return res.status(500).json(new ApiResponse(500, {},"Internal server error!"));
    }
})

const deleteReview = asyncHandler(async(req: Request, res: Response)=> {
    const {reviewId} = req.params
    try {
        const check = await Review.findById(reviewId)
        if(!check){
            return res.status(404).json(new ApiResponse(404,{},"Review not found!"));
        }
        await Review.findByIdAndDelete(reviewId)
        return res.status(200).json(new ApiResponse(200,{},"Review deleted successfully"))
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, {},"Internal server error!"));
    }
})

const getRestaurantReviews = asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId } = req.params;
    const { page = "1", limit = "10", sortBy = "createdAt", order = "desc" } = req.query;

    try {
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;
        const sortOrder = order === "asc" ? 1 : -1;

        const reviews = await Review.find({ entityId: restaurantId, entityType: "restaurant" })
            .sort({ [sortBy as string]: sortOrder })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const totalReviews = await Review.countDocuments({ entityId: restaurantId, entityType: "restaurant" });

        return res.status(200).json(new ApiResponse(200, { reviews, totalReviews, page: pageNum, limit: limitNum }, "Reviews fetched successfully"));
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, {}, "Internal server error!"));
    }
});


const getDishReviews = asyncHandler(async (req: Request, res: Response) => {
    const { dishId } = req.params;
    const { page = "1", limit = "10", sortBy = "createdAt", order = "desc" } = req.query;

    try {
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;
        const sortOrder = order === "asc" ? 1 : -1;

        const reviews = await Review.find({ entityId: dishId, entityType: "dish" })
            .sort({ [sortBy as string]: sortOrder })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const totalReviews = await Review.countDocuments({ entityId: dishId, entityType: "dish" });

        return res.status(200).json(new ApiResponse(200, { reviews, totalReviews, page: pageNum, limit: limitNum }, "Reviews fetched successfully"));
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, {}, "Internal server error!"));
    }
});

const getDeliveryAgentReviews = asyncHandler(async (req: Request, res: Response) => {
    const { deliveryAgentId } = req.params;
    const { page = "1", limit = "10", sortBy = "createdAt", order = "desc" } = req.query;

    try {
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;
        const sortOrder = order === "asc" ? 1 : -1;

        const reviews = await Review.find({ entityId: deliveryAgentId, entityType: "delivery-agent" })
            .sort({ [sortBy as string]: sortOrder })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const totalReviews = await Review.countDocuments({ entityId: deliveryAgentId, entityType: "delivery-agent" });

        return res.status(200).json(new ApiResponse(200, { reviews, totalReviews, page: pageNum, limit: limitNum }, "Reviews fetched successfully"));
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, {}, "Internal server error!"));
    }
});


export {
    addReview,
    editReview,
    deleteReview,
    getRestaurantReviews,
    getDishReviews,
    getDeliveryAgentReviews
}