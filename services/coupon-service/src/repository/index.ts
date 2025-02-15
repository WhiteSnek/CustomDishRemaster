import { ObjectId } from "mongoose";
import { Coupon } from "../model";

class Repository {
  async create(data: any) {
    return await Coupon.create(data);
  }

  async findOne(data: any) {
    return await Coupon.findOne(data);
  }

  async findById(id: ObjectId) {
    return await Coupon.findById(id);
  }

  async update(id: string | ObjectId, data: any) {
    return await Coupon.findByIdAndUpdate(id, data, { new: true });
  }

  async claim(id: ObjectId, userId: string) {
    return await Coupon.findByIdAndUpdate(
      id,
      {
        $push: { claimedBy: userId },
      },
      { new: true }
    );
  }

  async delete(id: ObjectId){
    return await Coupon.findByIdAndDelete(id)
  }

  async getCoupons(){
    
  }
}

export default Repository;