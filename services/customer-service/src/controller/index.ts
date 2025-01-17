import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/AsyncHandler";
import { Customer } from "../model";
import { Request, Response } from "express";
import { uploadToS3 } from "../utils/uploadOnS3";
import { generateTokens } from "../queue";


const registerUser = asyncHandler(async (req:Request, res:Response) => {
    // get customer details from front end
    const { fullname, email, username, password, mobileNumber } = req.body;
    // validation - not empty
    if (
      [fullname, email, username, password, mobileNumber].some((field) => field?.trim() === "")
    ) {
        return res
        .status(400)
        .json(new ApiResponse(400, {}, "All fields is required"));
    }
  
    // check if customer already exists: username and email
    const existedUser = await Customer.findOne({
      $or: [{ email }, { mobileNumber }],
    });
    if (existedUser)
      return res.status(409).json( new ApiResponse(409, {}, "Customer with email or username exists"));
  
    // check for images
    const displayImageFile = req.file; 
    let displayImage = null;
    // check for avatar
    if (displayImageFile){
      displayImage = await uploadToS3(displayImageFile, `profile/${username}`);
      if (!displayImage) return res.status(500).json( new ApiResponse(500, {}, "displayImage upload failed!"));
    }
    // create customer object - create entry in db
    const customer = await Customer.create({
      fullname,
      displayImage,
      email,
      password,
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
  const { email, username, password } = req.body;

  // Check if username or email is provided
  if (!username && !email) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Username or Email is required"));
  }

  // Find the customer
  const customer = await Customer.findOne({
    $or: [{ username }, { email }],
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

  if(newDeviceLogin){
    // TODO: send email to the user in case of new device login
    console.log(`Logged in from new device: ${deviceInfo}`)
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
  await Customer.findByIdAndUpdate(
    req.customer?._id, 
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
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

const updateAccountDetails = asyncHandler(async(req: Request, res: Response)=>{
  const { email, mobileNumber } = req.body;
  if(!email || !mobileNumber) return res.status(400).json(new ApiResponse(400,{},"Atleast one of the fields is required!"))
  const customerId = req.customer._id;
  //TODO: email or mobile number authentication logic.
  const customer = await Customer.findByIdAndUpdate(customerId, {
    $set: {
      email,
      mobileNumber
    }
  }, {
    new: true
  });
  if(!customer) return res.status(500).json(new ApiResponse(500,{},"Something went wrong while updating the details"))
    return res.status(200).json(new ApiResponse(200, customer, "Account details updated successfully"));
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
    await Customer.findByIdAndDelete(customerId);
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


export { loginUser, registerUser, logoutUser, getCurrentCustomer, updateAccountDetails, updatePassword, deactivateAccount, deleteAccount, addAddress, deleteAddress };
