import Service from "../service";
import { Request, Response } from 'express'
import { ApiResponse } from "../utils/ApiResponse";
class Controller {
    private service: Service;
    constructor() {
        this.service = new Service()
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
            if (!fullname || !email || !password || !mobileNumber || !vehicle || !deliveryArea) {
                res.status(400).json(new ApiResponse(400, {}, "All the fields are required"));
            }
            const { type, modelName, licenseNumber } = vehicle;
            if (!type || !modelName || !licenseNumber) {
                res.status(400).json(new ApiResponse(400, {}, "Vehicle details are required"));
            }
    
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const displayImageFile = files.displayImage ? files.displayImage[0].path : null;
            const vehicleDisplayImageFile = files.vehicleImage ? files.vehicleImage[0].path : null;
            if (!displayImageFile || !vehicleDisplayImageFile) {
                res.status(400).json(new ApiResponse(400, {}, "Both user and vehicle display images are required"));
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
                displayImageFile
            };
    
            const result = await this.service.register(data);
            console.log(result)
            if(!result) return res.status(500).json(new ApiResponse(500,{},"Something went wrong!"))
            res.status(200).json(new ApiResponse(200, result, "Registration Success"));
        } catch (error: any) {
            res.status(500).json(new ApiResponse(500, {}, error.message));
        }
    }
}

export default new Controller();