import { Document, ObjectId } from 'mongoose'

export interface TokenType extends Document {
    _id: string | ObjectId;
    userId: string | ObjectId;
    userType: string;
    token: string;
    deviceInfo: Object;
    ipAddress: string;
    isRevoked: boolean;
}