import { Coupon } from "../model";

class Repository {
  async create(data: any) {
    return await Coupon.create(data);
  }

  async findOne(data: any) {
    return await Coupon.findOne(data);
  }

  async findById(id: string) {
    return await Coupon.findById(id);
  }

  async update(id: string, data: any) {
    return await Coupon.findByIdAndUpdate(id, data, { new: true });
  }

  async claim(id: string, userId: string) {
    return await Coupon.findByIdAndUpdate(
      id,
      {
        $push: { claimedBy: userId },
      },
      { new: true }
    );
  }

  async delete(id: string){
    return await Coupon.findByIdAndDelete(id)
  }

  async find(filters: any){
    return await Coupon.find(filters)
  }
}

export default Repository;