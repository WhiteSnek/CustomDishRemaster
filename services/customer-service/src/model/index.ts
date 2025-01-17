import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcrypt";
import { AddressType, CustomerType } from "../types/index";

const addressSchema = new Schema<AddressType>({
    name: {
      type: String,
      required: true
    },
    houseNo: {
        type: String,
        required: true,
    },
    street: {
        type: String,
        required: true,
    },
    district: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    pinCode: {
        type: String,
        required: true,
    }
})

const customerSchema = new Schema<CustomerType>(
  {
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
      required: true,
    },
    address: [{
      type: addressSchema,
    }],
    mobileNumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    }
  },
  {
    timestamps: true,
  }
);

// Pre-save Hook for Password Hashing
customerSchema.pre<CustomerType>("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to Check Password
customerSchema.methods.isPasswordCorrect = async function (
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};


export const Customer: Model<CustomerType> = mongoose.model<CustomerType>("Customer", customerSchema);
