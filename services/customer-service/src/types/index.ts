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
    password: string;
    isPasswordCorrect(password: string): Promise<boolean>;
  }

export interface AddressType extends Document {
    houseNo: string;
    street: string;
    district: string;
    city: string;
    state: string;
    pinCode: string;
}