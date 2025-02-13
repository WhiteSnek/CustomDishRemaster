import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/AsyncHandler";
import { Customer } from "../model";
import { Request, Response } from "express";
import { deleteFromS3, uploadToS3 } from "../utils/uploadOnS3";
import { generateTokens } from "../queue/tokens";
import { sendNewDeviceLoginMail, sendOtpRequest } from "../queue/messaging";
import bcrypt from 'bcrypt'

const registerUser = asyncHandler(async (req:Request, res:Response) => {
    // get customer details from front end
    const { fullname, email,  password, mobileNumber } = req.body;
    // validation - not empty
    if (!fullname || !email || !password || !mobileNumber ||
      [fullname, email, password, mobileNumber].some((field) => field?.trim() === "")
    ) {
      console.log(fullname, email, password, mobileNumber)
        return res
        .status(400)
        .json(new ApiResponse(400, {}, "All fields is required"));
    }
  
    // check if customer already exists: mobile number and email
    const existedUser = await Customer.findOne({
      $or: [{ email }, { mobileNumber }],
    });
    if (existedUser)
      return res.status(409).json( new ApiResponse(409, {}, "Customer with email or mobile number exists"));
  
    // check for images
    const displayImageFile = req.file; 
    let displayImage = null;
    // check for avatar
    if (displayImageFile){
      displayImage = await uploadToS3(displayImageFile, `profiles/customer/${email.split('@')[0]}`);
      if (!displayImage) return res.status(500).json( new ApiResponse(500, {}, "displayImage upload failed!"));
    }
    // create customer object - create entry in db
    const hash = await bcrypt.hash(password, 10)
    const customer = await Customer.create({
      fullname,
      displayImage,
      email,
      password: hash,
      mobileNumber
    });
  
    // remove password and refrest token field from response
    const createdUser = await Customer.findById(customer._id).select(
      "-password"
    );
  
    // check for usr creation
    if (!createdUser) {
        return res.status(500).json( new ApiResponse(500, {}, "Something went wrong creating customer"))
    }
  
    // return response
    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "Customer registered successfully"));
  });



const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, mobileNumber, password } = req.body;

  // Check if username or email is provided
  if (!mobileNumber && !email) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Mobile number or Email is required"));
  }

  // Find the customer
  const customer = await Customer.findOne({
    $or: [{ mobileNumber }, { email }],
  });

  if (!customer) {
    return res.status(404).json(new ApiResponse(404, {}, "Customer not found!"));
  }
  // if account is inactive, then activate it
  if(customer.status === "inactive") customer.status = 'active'

  // Validate password
  const isPasswordValid = await customer.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res
      .status(401)
      .json(new ApiResponse(401, {}, "Incorrect credentials"));
  }

  const deviceInfo = req.headers['user-agent'] || 'unknown'; 
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown'; 

  // Generate access and refresh tokens and a boolean to check if the user logged in using a new device
  const { accessToken, refreshToken, newDeviceLogin } = await generateTokens(
    customer._id.toString(),
    deviceInfo,
    ipAddress
  );
  console.log("new device login?: ",newDeviceLogin)
  const name = customer.fullname
  console.log(name)
  if(newDeviceLogin){
    try {
      await sendNewDeviceLoginMail(email, name, deviceInfo)
    } catch (error) {
      console.log(error)
    }
  }

  // Fetch the logged-in customer details without sensitive fields
  const loggedInCustomer = await Customer.findById(customer._id).select(
    "-password -refreshToken"
  );

  if (!loggedInCustomer) {
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Customer retrieval failed"));
  }

  // Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
  };

  // Send response
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          customer: loggedInCustomer,
          accessToken,
          refreshToken,
        },
        "Customer logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async(req: Request,res: Response)=>{
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Customer logged out"));
})

const getCurrentCustomer = asyncHandler(async(req: Request, res: Response)=> {
  return res.status(200).json(new ApiResponse(200, req.customer, "Current customer fetched successfully"))
})

const sendOtp = asyncHandler(async(req: Request, res: Response)=> {
  const { email } = req.body;
  try {
    await sendOtpRequest(email);
    return res.status(200).json(new ApiResponse(200, {}, "OTP sent successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, "Error sending OTP"));
  }
})

const updatePassword = asyncHandler(async(req: Request, res: Response)=>{
  const { email, newPassword } = req.body
  //TODO: validate email logic
  try {
    await Customer.findOneAndUpdate({
      email,
    }, {
      $set: {
        password: newPassword,
      }
    }, {
      new: true
    })
    return res.status(200).json(new ApiResponse(200, {}, "Password updated successfully"))
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, "Something went wrong while updating the password!"))
  }
})

const deactivateAccount = asyncHandler(async(req: Request, res: Response) => {
  const customerId = req.customer._id
  try {
    await Customer.findByIdAndUpdate(customerId, {
      $set: {
        status: "inactive",
      }
    },{
      new: true
    })
    return res.status(200).json(new ApiResponse(200, {}, "Account deactivated successfully"))
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, "Something went wrong while deactivating the account"))
  }
})

const deleteAccount = asyncHandler(async(req: Request, res:Response) => {
  const customerId = req.customer._id
  try {
    const customer = await Customer.findByIdAndDelete(customerId);
    const key = `profiles/customer/${customer?.email.split('@')[0]}`
    await deleteFromS3(key);
    return res.status(200).json(new ApiResponse(200, {}, "Account deleted successfully"))
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, "Something went wrong while deleting the account"))
  }
})

const addAddress = asyncHandler(async(req: Request, res: Response) => {
  const {name, houseNo, street, district,city, state, pinCode} = req.body;
  if([name, houseNo, street, district, city, state, pinCode].some((field) => field?.trim() === "")){
    return res.status(400).json(new ApiResponse(400, {}, "All fields are required!"))
  }
  const customerId = req.customer._id
  try {
    await Customer.findByIdAndUpdate(customerId, {
      $push: {
        address: {
          name,
          houseNo,
          street,
          district,
          city,
          state,
          pinCode
        }
      }
    })
    return res.status(200).json(new ApiResponse(200, {}, "Address added successfully"))
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, "Something went wrong while adding the address"))
  }
})

const deleteAddress = asyncHandler(async(req: Request, res: Response)=>{
  const {name} = req.body
  const customerId = req.customer._id;
  try {
    await Customer.findByIdAndUpdate(customerId, {
      $pull: {
        address: { name },
      }
    }, {
      new: true,
    });
    return res.status(200).json(new ApiResponse(200,{},"Address deleted successfully!"))
  } catch (error) {
    return res.status(500).json(new ApiResponse(500,{},"Something went wrong while deleting the address!"))
  }
})


export { loginUser, registerUser, logoutUser, getCurrentCustomer, updatePassword, deactivateAccount, deleteAccount, addAddress, deleteAddress, sendOtp };
