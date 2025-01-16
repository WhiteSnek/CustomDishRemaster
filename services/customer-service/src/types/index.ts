import mongoose from "mongoose";
import { ObjectId, Document } from "mongoose";

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
}

export interface CustomerType extends Document {
    _id: string | ObjectId;
    email: string;
    fullname: string;
    displayImage: string;
    address?: AddressType;
    order: mongoose.Types.ObjectId[];
    cart: mongoose.Types.ObjectId[];
    password: string;
    refreshToken?: string;
    isPasswordCorrect(password: string): Promise<boolean>;
    generateAccessToken(): string;
    generateRefreshToken(): string;
  }

  export interface RestaurantType extends Document {
    _id: string | ObjectId;
    email: string;
    fullname: string;
    displayImage: string;
    address?: AddressType;
    order: mongoose.Types.ObjectId[];
    cart: mongoose.Types.ObjectId[];
    password: string;
    refreshToken?: string;
    isPasswordCorrect(password: string): Promise<boolean>;
    generateAccessToken(): string;
    generateRefreshToken(): string;
  }

  
export interface AddressType extends Document {
    houseNo: string;
    street: string;
    district: string;
    city: string;
    state: string;
    pinCode: string;
}