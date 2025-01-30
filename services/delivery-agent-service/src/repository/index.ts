import { DeliveryAgent } from "../models";

class Repository {
    async create(data: any) {
        return await DeliveryAgent.create(data);
    } 

    async findOne(data: any){
        return await DeliveryAgent.findOne({$where: data})
    }

    async findByEmailOrMobile(email: string, mobileNumber: string){
        return await DeliveryAgent.findOne({ $or: [{ email }, { mobileNumber }] });
    }

    async findById(id: string) {
        return await DeliveryAgent.findById(id).select("-password");
      }
}

export default Repository;