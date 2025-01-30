import { Request } from "express";
import { DeliveryAgentType } from "./types";


declare global {
  namespace Express {
    interface Request {
      agent?: DeliveryAgentType
    }
  }
}
