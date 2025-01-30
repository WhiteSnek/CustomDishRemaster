import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcrypt'
import { Model } from "mongoose";
import { DeliveryAgentType, VehicleType } from "../types/index";

const vehicleSchema = new Schema<VehicleType>({
    type: {
        type: String,
        required: true
    },
    modelName: {
        type: String,
        required: true
    },
    displayImage: {
        type: String,
        required: true
    },
    licenseNumber: {
        type: String,
        required: true
    }
})

const agentSchema = new Schema<DeliveryAgentType>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    displayImage: {
        type: String,
    },
    mobileNumber: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    rating: {
        type: Number,
        default: 0
    },
    availabilityStatus: {
        type: String,
        enum: ["available", "inavailable"],
        default: "available",
    },
    vehicle: {
        type: vehicleSchema,
        required: true
    },
    deliveryArea: [{
        type: String,
        required: true
    }]
},
    {
        timestamps: true,
})

agentSchema.pre<DeliveryAgentType>("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  });
  
  // Method to Check Password
  agentSchema.methods.isPasswordCorrect = async function (
    password: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
  };
  
  
  export const DeliveryAgent: Model<DeliveryAgentType> = mongoose.model<DeliveryAgentType>("DeliveryAgent", agentSchema);

