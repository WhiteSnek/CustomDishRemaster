import { z } from 'zod';

const AddCouponDTO = z.object({
    code: z.string().min(3).max(20),
    title: z.string().min(3).max(50),
    description: z.string().max(255).optional(), 
    couponType: z.enum(["Percentage", "Fixed"]),
    value: z.number().positive(), 
    maxDiscount: z.number().nonnegative(), 
    minSpend: z.number().nonnegative(),
    expiryDate: z.coerce.date() 
});

const filterDTO = z.object({
    code: z.string().optional(),
    couponType: z.enum(["Percentage", "Fixed"]).optional(),
    minSpend: z.number().nonnegative().optional(),
    expiryDate: z.date().optional()
});

const updateCouponDTO = AddCouponDTO.partial(); 

export { AddCouponDTO, filterDTO, updateCouponDTO };
