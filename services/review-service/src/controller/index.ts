import { asyncHandler } from "../utils/AsyncHandler";
import {Request, Response} from 'express'

const addReview = asyncHandler(async(req: Request, res: Response) => {
    const data = req.body
    
})

const editReview = asyncHandler(async(req: Request, res: Response)=> {

})

const deleteReview = asyncHandler(async(req: Request, res: Response)=> {

})

const getRestaurantReviews = asyncHandler(async(req: Request, res: Response)=> {

})

const getDishReviews = asyncHandler(async(req: Request, res: Response)=> {

})

const getDeliveryAgentReviews = asyncHandler(async(req: Request, res: Response)=> {

})


export {
    addReview,
    editReview,
    deleteReview,
    getRestaurantReviews,
    getDishReviews,
    getDeliveryAgentReviews
}