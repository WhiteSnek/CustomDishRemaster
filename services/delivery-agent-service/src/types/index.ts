import { ObjectId, Document } from "mongoose";


export interface DeliveryAgentType extends Document {
    _id: string | ObjectId;
    email: string;
    fullname: string;
    displayImage: string;
    vehicle: VehicleType;
    mobileNumber: string;
    password: string;
    status: string;
    rating: number;
    availabilityStatus: string;
    deliveryArea: string[];
    isPasswordCorrect(password: string): Promise<boolean>;
  }

export interface VehicleType extends Document {
    type: string;
    modelName: string;
    displayImage: string;
    licenseNumber: string;
}