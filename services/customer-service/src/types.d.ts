import { Request } from "express";
import { Customer } from "./model";

declare global {
  namespace Express {
    interface Request {
      customer?: Customer
    }
  }
}
