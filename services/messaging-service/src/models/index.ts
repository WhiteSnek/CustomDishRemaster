import mongoose, {Schema} from "mongoose";

const otpSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        required: true,
    },
    otp: {
        type: Number,
        required: true
    },
    expiresAt: {
        type: Date,
    }
}, {
    timestamps: true
})

export const OTP = mongoose.model("OTP", otpSchema)