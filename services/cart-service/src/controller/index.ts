import { Request, Response } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { CartItems, CartItemSchema, CartSchema, CartType } from "../model";
import { ApiResponse } from "../utils/ApiResponse";
import client from "../config";

const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const { userId, data } = req.body;
  const cartKey = `cart:${userId}`;
  try {
    const validateData = CartItemSchema.parse(data);
    const cartData = await client.get(cartKey);
    let cart = cartData
      ? JSON.parse(cartData)
      : { userId, items: [], totalPrice: 0 };
    cart = CartSchema.parse(cart);
    cart.items.push(validateData);
    cart.totalPrice += validateData.price * validateData.quantity;

    await client.set(cartKey, JSON.stringify(cart));
    return res
      .status(201)
      .json(new ApiResponse(201, {}, "Added to cart successfully"));
  } catch (error: any) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.message, "Something went wrong!"));
  }
});

const editCart = asyncHandler(async (req: Request, res: Response) => {
  const { dishId, quantity } = req.body;
  const userId = req.userId;
  const cartKey = `cart:${userId}`;
  try {
    const cartData = await client.get(cartKey);
    if (!cartData) {
      return res.status(404).json(new ApiResponse(404, {}, "Cart not found"));
    }
    let cart: CartType = JSON.parse(cartData);
    cart = CartSchema.parse(cartData);
    const itemIndex = cart.items.findIndex(
      (item: CartItems) => item.dishId == dishId
    );
    if (itemIndex === -1) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Item not found in cart"));
    }
    if (quantity > 0) {
      cart.totalPrice +=
        (quantity - cart.items[itemIndex].quantity) *
        cart.items[itemIndex].price;
      cart.items[itemIndex].quantity = quantity;
    } else {
      cart.totalPrice -=
        cart.items[itemIndex].price * cart.items[itemIndex].quantity;
      cart.items.splice(itemIndex, 1);
    }
    await client.set(cartKey, JSON.stringify(cart));

    return res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart updated successfully"));
  } catch (error: any) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, error.errors || "Invalid update request"));
  }
});

const getCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const cartKey = `cart:${userId}`;
  const cartData = await client.get(cartKey);
  if (!cartData) return null;

  try {
    const cart = JSON.parse(cartData);
    const data = CartSchema.parse(cart);
    return res
      .status(200)
      .json(new ApiResponse(200, data, "Cart data fetched successfully"));
  } catch (error: any) {
    console.error("Corrupted cart data:", error.errors);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          error.message,
          "Something went wrong while fetching carts"
        )
      );
  }
});

const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const cartKey = `cart:${userId}`;
  try {
    await client.del(cartKey);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Cart item deleted successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Something went wrong!!"));
  }
});

export { addToCart, editCart, getCart, clearCart };
