import Service from "../service";
import { Request, Response } from "express";
import { ApiResponse, ApiResponseType } from "../utils/ApiResponse";
import { sendOtpRequest } from "../queue/messaging";
class Controller {
  private service: Service;
  constructor() {
    this.service = new Service();
  }

  async register(req: Request, res: Response) {
    try {
      const {
        fullname,
        email,
        password,
        mobileNumber,
        vehicle,
        deliveryArea = [],
      } = req.body;
      if (
        !fullname ||
        !email ||
        !password ||
        !mobileNumber ||
        !vehicle ||
        !deliveryArea
      ) {
        res
          .status(400)
          .json(new ApiResponse(400, {}, "All the fields are required"));
      }
      const { type, modelName, licenseNumber } = vehicle;
      if (!type || !modelName || !licenseNumber) {
        res
          .status(400)
          .json(new ApiResponse(400, {}, "Vehicle details are required"));
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const displayImageFile = files.displayImage
        ? files.displayImage[0].path
        : null;
      const vehicleDisplayImageFile = files.vehicleImage
        ? files.vehicleImage[0].path
        : null;
      if (!displayImageFile || !vehicleDisplayImageFile) {
        res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              "Both user and vehicle display images are required"
            )
          );
      }

      const data = {
        fullname,
        email,
        password,
        mobileNumber,
        vehicle: {
          ...vehicle,
          displayImage: vehicleDisplayImageFile,
        },
        deliveryArea,
        displayImageFile,
      };

      const response: ApiResponseType = await this.service.register(data);
      console.log(response);
      if (!response)
        res
          .status(500)
          .json(new ApiResponse(500, {}, "Something went wrong!"));
      res.status(response.statusCode).json(response);
    } catch (error: any) {
      res.status(500).json(new ApiResponse(500, {}, error.message));
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password, mobileNumber } = req.body;
      if (!email && !mobileNumber) {
        res
          .status(400)
          .json(new ApiResponse(400, {}, "Email or mobilenumber is required"));
      }
      if (!password)
        res.status(400).json(new ApiResponse(400, {}, "Password is required"));
      const deviceInfo = req.headers["user-agent"] || "unknown";
      const ipAddress = req.ip || req.connection.remoteAddress || "unknown";
      const response = await this.service.login(
        email,
        password,
        mobileNumber,
        deviceInfo,
        ipAddress
      );
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
      };

      res
        .status(response.statusCode)
        .cookie("accessToken", response.data.accessToken, cookieOptions)
        .cookie("refreshToken", response.data.refreshToken, cookieOptions)
        .json(response);
    } catch (error: any) {
      res.status(500).json(new ApiResponse(500, {}, error.message));
    }
  }

  async logout(req: Request, res: Response) {
    const options = {
      httpOnly: true,
      secure: true,
    };
    res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "Customer logged out"));
  }

  async getCurrentAgent(req: Request, res: Response) {
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          req.agent,
          "Current delivery agent fetched successfully"
        )
      );
  }

  async sendOtp(req: Request, res: Response) {
    const { email } = req.body;
    try {
      await sendOtpRequest(email);
      res
        .status(200)
        .json(new ApiResponse(200, {}, "OTP sent successfully"));
    } catch (error) {
      res
        .status(500)
        .json(new ApiResponse(500, {}, "Error sending OTP"));
    }
  }

  async updatePassword(req: Request, res: Response){
    const { email, newPassword } = req.body
    //TODO: validate email logic
    try {
      const response: ApiResponseType = await this.service.updatePassword(email, newPassword);
      res.status(response.statusCode).json(response)
    } catch (error) {
      res.status(500).json(new ApiResponse(500, {}, "Something went wrong while updating the password!"))
    }
  }

  async updateAccountDetails(req: Request, res: Response) {
    try {
        const userId = req.agent._id
        // TODO: add logic to handle every field change
        const {deliveryArea} = req.body
        const response = await this.service.updateDetails(userId, deliveryArea)
        res.status(response.statusCode).json(response)
    } catch (error) {
        res.status(500).json(new ApiResponse(500, {}, "Something went wrong while updating the profile!"))
    }
  }
}

export default new Controller();
