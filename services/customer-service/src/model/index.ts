import mongoose, { Schema, Model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { AddressType, CustomerType } from "../types/index";

const addressSchema = new Schema<AddressType>({
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
    address: {
      type: addressSchema,
    },
    order: [
      {
        type: Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    cart: [
      {
        type: Schema.Types.ObjectId,
        ref: "Cart",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
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

// Method to Generate Access Token
customerSchema.methods.generateAccessToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      Customername: this.Customername,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY as string,
    }
  );
};

// Method to Generate Refresh Token
customerSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      Customername: this.Customername,
      fullname: this.fullname,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY as string,
    }
  );
};

// Export the Customer Model
export const Customer: Model<CustomerType> = mongoose.model<CustomerType>("Customer", customerSchema);
