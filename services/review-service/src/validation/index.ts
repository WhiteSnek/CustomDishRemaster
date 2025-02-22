import { z } from 'zod';

const AddReviewDTO = z.object({
    entityId: z.string(),
    entityType: z.enum(["restaurant", "delivery-agent", "dish"]),
    comment: z.string().min(3).max(255),
    rating: z.number().min(1).max(5),
});

const UpdateReviewDTO = z.object({
    entityId: z.string(),
    entityType: z.enum(["restaurant", "delivery-agent", "dish"]),
    comment: z.string().min(3).max(255).optional(),
    rating: z.number().min(1).max(5).optional(),
});

export { AddReviewDTO, UpdateReviewDTO };
