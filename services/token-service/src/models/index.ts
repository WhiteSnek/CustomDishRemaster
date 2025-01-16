import mongoose, { Model, Schema } from "mongoose";
import { TokenType } from "../types";

const refreshTokenSchema = new Schema<TokenType>({
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

export const RefreshToken: Model<TokenType> = mongoose.model<TokenType>('RefreshToken', refreshTokenSchema)

