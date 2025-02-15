import { ObjectId } from "mongoose";
import Repository from "../repository";
import { ApiResponse } from "../utils/ApiResponse";

class Service {
  private repo: Repository;
  constructor() {
    this.repo = new Repository();
  }

  async addCoupon(data: any) {
    try {
      const check = await this.repo.findOne(data);
      if (check) {
        return new ApiResponse(409, {}, "Coupon already exists");
      }
      await this.repo.create(data);
      return new ApiResponse(201, {}, "Coupon created successfully");
    } catch (error: any) {
      return new ApiResponse(500, error.message, "Something went wrong!");
    }
  }

  async updateCoupon(id: string, data: any) {
    try {
      await this.repo.update(id, data);
      return new ApiResponse(200, {}, "Coupon updated successfully");
    } catch (error: any) {
      return new ApiResponse(500, error.message, "Something went wrong!");
    }
  }

  async deleteCoupon(id: ObjectId) {
    try {
      await this.repo.delete(id);
    } catch (error: any) {
      return new ApiResponse(500, error.message, "Something went wrong!");
    }
  }

  async claimCoupon(id: ObjectId, userId: string) {
    try {
      const coupon = await this.repo.findById(id);
      if (!coupon) {
        return new ApiResponse(404, {}, "Coupon not found!");
      }
      await this.repo.claim(id, userId);
      return new ApiResponse(200, {}, "Coupon claimed!");
    } catch (error: any) {
      return new ApiResponse(500, error.message, "Something went wrong!");
    }
  }

  async getCoupons() {}

  async getCouponById(id: ObjectId) {
    try {
      return this.repo.findById(id);
    } catch (error: any) {
      return new ApiResponse(500, error.message, "Something went wrong!");
    }
  }
}
