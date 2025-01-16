import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/AsyncHandler";
import { Customer } from "../model";
import { TokenResponse } from "../types/index";
import { Request, Response } from "express";
import { uploadToS3 } from "../utils/uploadOnS3";

const generateAccessAndRefreshTokens = async (
  userId: string
): Promise<TokenResponse> => {
  try {
    const customer = await Customer.findById(userId);

    if (!customer) {
      throw new Error("Customer not found!");
    }
    const accessToken = customer.generateAccessToken();
    const refreshToken = customer.generateRefreshToken();

    customer.refreshToken = refreshToken;
    await customer.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error("Something went wrong while generating tokens");
  }
};


const registerUser = asyncHandler(async (req:Request, res:Response) => {
    // get customer details from front end
    const { fullname, email, username, password } = req.body;
    // validation - not empty
    if (
      [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        return res
        .status(400)
        .json(new ApiResponse(400, {}, "All fields is required"));
    }
  
    // check if customer already exists: username and email
    const existedUser = await Customer.findOne({
      $or: [{ username }, { email }],
    });
    if (existedUser)
      return res.status(409).json( new ApiResponse(409, {}, "Customer with email or username exists"));
  
    // check for images
    const avatarFile = req.file; 
  
    // check for avatar
    if (!avatarFile) return res.status(400).json( new ApiResponse(400, {}, "Avatar file is required"));
  
    const avatar = await uploadToS3(avatarFile, `profile/${username}`);
    if (!avatar) return res.status(500).json( new ApiResponse(500, {}, "Avatar file upload failed!"));
  
    // create customer object - create entry in db
    const customer = await Customer.create({
      fullname,
      avatar,
      email,
      password,
      username: username.toLowerCase(),
    });
  
    // remove password and refrest token field from response
    const createdUser = await Customer.findById(customer._id).select(
      "-password -refreshToken"
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

  // Validate password
  const isPasswordValid = await customer.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res
      .status(401)
      .json(new ApiResponse(401, {}, "Incorrect credentials"));
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    customer._id.toString()
  );

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

export { loginUser, registerUser, logoutUser };
