import { ObjectId } from "mongoose";
import { sendNewDeviceLoginMail } from "../queue/messaging";
import { generateTokens } from "../queue/tokens";
import Repository from "../repository";
import { ApiResponse, ApiResponseType } from "../utils/ApiResponse";
import { uploadToS3 } from "../utils/uploadOnS3";
class Service {
  private repo: Repository;
  constructor() {
    this.repo = new Repository();
  }

  async register(data: any): Promise<ApiResponseType> {
    try {
      const existingUser = await this.repo.findByEmailOrMobile(
        data.email,
        data.mobileNumber
      );
      if (existingUser) {
        return new ApiResponse(
          409,
          {},
          "User with this email or mobile number already exists"
        );
      }

      let displayImage = null;
      if (data.displayImageFile) {
        displayImage = await uploadToS3(
          data.displayImageFile,
          `profiles/delivery-agent/${data.email.split("@")[0]}`
        );
        if (!displayImage)
          return new ApiResponse(500, {}, "Display image upload failed");
      }
      let vehicleImage = null;
      if (data.vehicle.displayImage) {
        vehicleImage = await uploadToS3(
          data.vehicle.displayImage,
          `vehicles/$${data.email.split("@")[0]}/${data.vehicle.licenseNumber}`
        );
        if (!vehicleImage)
          return new ApiResponse(500, {}, "Vehicle image upload failed");
      }
      const agentInfo = {
        fullname: data.fullname,
        email: data.email,
        mobileNumber: data.mobileNumber,
        password: data.password,
        displayImage,
        vehicle: {
          type: data.vehicle.type,
          licenseNumber: data.vehicle.licenseNumber,
          modelName: data.vehicle.modelName,
          displayImage: vehicleImage,
        },
        deliveryArea: data.deliveryArea,
      };
      const deliveryAgent = await this.repo.create(agentInfo);
      return new ApiResponse(201, deliveryAgent, "Registration success!!");
    } catch (error: any) {
      throw new Error("Service Error: " + error.message);
    }
  }

  async login(
    email: string,
    password: string,
    mobileNumber: string,
    deviceInfo: string,
    ipAddress: string
  ): Promise<ApiResponseType> {
    try {
      const agent = await this.repo.findByEmailOrMobile(email, mobileNumber);
      if (!agent) return new ApiResponse(404, {}, "Delivery agent not found");
      const isPasswordValid = await agent.isPasswordCorrect(password);
      if (!isPasswordValid) {
        return new ApiResponse(401, {}, "Incorrect credentials");
      }
      const { accessToken, refreshToken, newDeviceLogin } =
        await generateTokens(agent._id.toString(), deviceInfo, ipAddress);

      const name = agent.fullname;
      console.log(name);
      if (newDeviceLogin) {
        try {
          await sendNewDeviceLoginMail(email, name, deviceInfo);
        } catch (error) {
          console.log(error);
        }
      }
      const loggedInAgent = await this.repo.findById(agent.id)
      return new ApiResponse(200, {
        customer: loggedInAgent,
        accessToken,
        refreshToken,
      },"User logged in successfully");
    } catch (error: any) {
      throw new Error("Service Error: " + error.message);
    }
  }

  async updatePassword(email: string, newPassword: string): Promise<ApiResponseType>{
    const user = await this.repo.findOne(email)
    if(!user) return new ApiResponse(404,{},"User not found!")
    const updated = await this.repo.update(user._id, newPassword)
    if(!updated) return new ApiResponse(500,{},"Something went wrong")
    return new ApiResponse(200,{},"Password updated successfully")
  }

  async updateDetails(userId: string| ObjectId ,data: any): Promise<ApiResponseType>{
    const agent = await this.repo.findById(userId)
    if(!agent) return new ApiResponse(404,{},"Delivery agent not found!")
        const updated = await this.repo.update(userId, data)
    if(!updated) return new ApiResponse(500,{},"Something went wrong")
    return new ApiResponse(200,{},"Account Details updated successfully")
  }

}

export default Service;
