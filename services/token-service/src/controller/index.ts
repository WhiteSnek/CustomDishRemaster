import { RefreshToken } from "../models";
import jwt from "jsonwebtoken";

export const generateTokens = async (
  userId: string,
  userType: string,
  deviceInfo: string,
  ipAddress: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  newDeviceLogin: boolean;
}> => {
  const accessToken = generateAccessToken(userId, userType);

  const checkExistingEntry = await RefreshToken.findOne({ userId, userType, isRevoked:false });
  let refreshToken: string;
  let newDeviceLogin = false;

  if (!checkExistingEntry) {
    // New entry
    refreshToken = generateRefreshToken(userId, userType);
    const token = await RefreshToken.create({
      userId,
      userType,
      deviceInfo: [deviceInfo],
      ipAddress,
      token: refreshToken,
    });

    if (!token) throw new Error("Error saving refresh token in the database");
  } else {
    // Existing entry
    if (!checkExistingEntry.deviceInfo.includes(deviceInfo)) {
      newDeviceLogin = true;
      checkExistingEntry.deviceInfo.push(deviceInfo);
      await checkExistingEntry.save();
    }
    refreshToken = checkExistingEntry.token;
  }
  return { accessToken, refreshToken, newDeviceLogin };
};

const generateAccessToken = (userId: string, userType: string): string => {
  try {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new Error(
        "ACCESS_TOKEN_SECRET is not defined in environment variables"
      );
    }

    return jwt.sign({ userId, userType }, secret, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
  } catch (error: any) {
    console.error("Error generating access token:", error.message);
    throw error;
  }
};

const generateRefreshToken = (userId: string, userType: string): string => {
  try {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
      throw new Error(
        "REFRESH_TOKEN_SECRET is not defined in environment variables"
      );
    }

    return jwt.sign({ userId, userType }, secret, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
  } catch (error: any) {
    console.error("Error generating refresh token:", error.message);
    throw error;
  }
};

export const refreshTokens = async (
    userId: string,
    userType: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    newDeviceLogin: boolean;
  }> => {
    const existingEntry = await RefreshToken.findOne({ userId, userType });
  
    if (!existingEntry) {
      throw new Error("No refresh token found for this user.");
    }
  
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
      throw new Error("REFRESH_TOKEN_SECRET is not defined in environment variables");
    }
  
    try {
      jwt.verify(existingEntry.token, secret);
      const accessToken = generateAccessToken(userId, userType);
      const refreshToken = generateRefreshToken(userId, userType);

      existingEntry.token = refreshToken;
      await existingEntry.save();
  
      return { accessToken, refreshToken, newDeviceLogin: false };
    } catch (error: any) {
      console.error("Error verifying refresh token:", error.message);
      throw new Error("Invalid or expired refresh token.");
    }
};

export const revokeToken = async (
    userId: string,
    userType: string
  ): Promise<boolean> => {
    const existingEntry = await RefreshToken.findOne({ userId, userType });
    if (!existingEntry) {
      throw new Error("No refresh token found for this user.");
    }
    existingEntry.isRevoked = true
    await existingEntry.save()
    return true
}

export const restoreToken = async (
    userId: string,
    userType: string
  ): Promise<boolean> => {
    const existingEntry = await RefreshToken.findOne({ userId, userType });
    if (!existingEntry) {
      throw new Error("No refresh token found for this user.");
    }
    existingEntry.isRevoked = false
    await existingEntry.save()
    return true
}