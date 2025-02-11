import { z } from "zod";

const CustomizationsSchema = z.object({
  salty: z.number(),
  spicy: z.number(),
  extraCheese: z.number(),
  sweetness: z.number(),
  onion: z.boolean(),
  garlic: z.boolean(),
});

const CartItemSchema = z.object({
  dishId: z.string(),
  quantity: z.number().int().min(1),
  displayImage: z.string().url(),
  name: z.string().min(1), 
  price: z.number().min(0), 
  isVeg: z.boolean(),
  category: z.string().min(1),
  customizations: CustomizationsSchema.partial(), 
});

interface Customizations {
  salty?: number;
  spicy?: number;
  extraCheese?: number;
  sweetness?: number;
  onion?: boolean;
  garlic?: boolean;
}

interface CartItems {
  dishId: string;
  quantity: number;
  displayImage: string;
  name: string;
  price: number;
  isVeg: boolean;
  category: string;
  customizations?: Customizations;
}

interface CartType {
    userId: string
    items: CartItems[]
    totalPrice: number
}

const CartSchema = z.object({
    userId: z.string(),
    items: z.array(CartItemSchema).nonempty(),
    totalPrice: z.number().min(0)
})

export { CartItemSchema, CustomizationsSchema, CartItems, Customizations, CartSchema, CartType };
