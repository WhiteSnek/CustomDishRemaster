import { Request, Response } from "express";
import Service from "../service";
import { AddCouponDTO, updateCouponDTO, filterDTO } from "../validation";
import { ZodError } from "zod";
import { ApiResponse } from "../utils/ApiResponse";

class Controller {
    private service: Service;
    
    constructor() {
        this.service = new Service();
    }

    async addCoupon(req: Request, res: Response) {
        try {
            const validatedData = AddCouponDTO.parse(req.body);
            const response = await this.service.addCoupon(validatedData);
            return res.status(response.statusCode).json(response);
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json(new ApiResponse(500, error.errors, "Validation Error!"));
            }
            return res.status(500).json(new ApiResponse(500, {},"Internal server error!"));
        }
    }

    async editCoupon(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const validatedData = updateCouponDTO.parse(req.body);
            const response = await this.service.updateCoupon(id, validatedData);
            return res.status(response.statusCode).json(response);
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json(new ApiResponse(500, error.errors, "Validation Error!"));
            }
            return res.status(500).json(new ApiResponse(500, {},"Internal server error!"));
        }
    }

    async deleteCoupon(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const response = await this.service.deleteCoupon(id);
            return res.status(response.statusCode).json(response);
        } catch (error) {
            return res.status(500).json(new ApiResponse(500, {},"Internal server error!"));
        }
    }

    async getCoupons(req: Request, res: Response) {
        try {
            const filters = filterDTO.parse(req.query);
            const response = await this.service.getCoupons(filters);
            return res.status(response.statusCode).json(response);
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json(new ApiResponse(500, error.errors, "Validation Error!"));
            }
            return res.status(500).json(new ApiResponse(500, {},"Internal server error!"));
        }
    }

    async getCouponById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const response = await this.service.getCouponById(id);
            return res.status(response.statusCode).json(response);
        } catch (error) {
            return res.status(500).json(new ApiResponse(500, {},"Internal server error!"));
        }
    }

    async claimCoupon(req: Request, res: Response) {
        try {
            const { userId, couponCode } = req.body;
            const response = await this.service.claimCoupon(userId, couponCode);
            return res.status(response.statusCode).json(response);
        } catch (error) {
            return res.status(500).json(new ApiResponse(500, {},"Internal server error!"));
        }
    }
}

export default new Controller();
