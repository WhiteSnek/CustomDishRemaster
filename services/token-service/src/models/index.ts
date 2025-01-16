import mongoose, { Schema } from "mongoose";

const refreshTokenSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    },
    deviceInfo: {
        type: Object,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    isRevoked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema)

