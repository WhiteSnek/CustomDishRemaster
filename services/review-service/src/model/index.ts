import mongoose, { Schema } from 'mongoose'


const reviewSchema = new Schema({
    owner: {
        type: String,
        required: true
    },
    entityId: {
        type: String,
        required: true,
    },
    entityType: {
        type: String,
        enum: ["restaurant","delivery-agent","dish"],
        required: true,
    },
    comment: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true
    }
},{timestamps: true})


export const Review = mongoose.model("Review", reviewSchema);