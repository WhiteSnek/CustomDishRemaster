import Repository from "../repository";
import { uploadToS3 } from "../utils/uploadOnS3";
import bcrypt from 'bcrypt'
class Service {
    private repo: Repository
    constructor(){
        this.repo = new Repository()
    }

    async register(data: any){
        try {
            const existingUser = await this.repo.findByEmailOrMobile(data.email, data.mobileNumber);
            if (existingUser) {
                throw new Error("Customer with email or mobile number exists");
            }
    
            let displayImage = null
            if (data.displayImageFile) {
                displayImage = await uploadToS3(data.displayImageFile, `profiles/delivery-agent/${data.email.split('@')[0]}`);
                if (!displayImage) throw new Error("Display image upload failed");
            }
            let vehicleImage = null
            if(data.vehicle.displayImage){
                vehicleImage = await uploadToS3(data.vehicle.displayImage, `vehicles/$${data.email.split('@')[0]}/${data.vehicle.licenseNumber}`);
                if (!vehicleImage) throw new Error("Display image upload failed");
            }
            const password = await bcrypt.hash(data.password, 10);
            const agentInfo = {
                fullname: data.fullname,
                email: data.email,
                mobileNumber: data.mobileNumber,
                password,
                displayImage,
                vehicle: {
                    type: data.vehicle.type,
                    licenseNumber: data.vehicle.licenseNumber,
                    modelName: data.vehicle.modelName,
                    displayImage: vehicleImage
                },
                deliveryArea: data.deliveryArea
            }
            const deliveryAgent = await this.repo.create(agentInfo)
            return deliveryAgent
        } catch (error:any) {
            throw new Error('Service Error: ' + error.message)
        }
    }
}

export default Service;