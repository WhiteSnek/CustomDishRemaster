import mongoose, { Schema } from "mongoose";

const couponSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    couponType: {
        type: String,
        enum: ["Percentage", "Fixed"],
        required: true,
    },
    value: {
        type: Number,
        required: true,
    },
    maxDiscount: {
        type: Number,
        required: true
    },
    minimumSpend: {
        type: Number,
        default: 0
    },
    expiryDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    claimedBy:[{
        type: String
    }]
},{timestamps: true})

export const Coupon = mongoose.model("Coupon", couponSchema)