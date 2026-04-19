import jwt from "jsonwebtoken";
import ServerError from "../errors/ServerError.js";
import logger from "./logger.js";

const generateAccessToken = (admin) => {
  if (!admin || !admin._id) {
    throw new ServerError(400, "Admin object with _id is required.", [
      { field: "_id", issue: "required" },
    ]);
  }
  return jwt.sign(
    {
      _id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

const generateRefreshToken = (admin) => {
  if (!admin || !admin._id) {
    throw new ServerError(400, "Admin object with _id is required.", [
      { field: "_id", issue: "required" },
    ]);
  }
  return jwt.sign(
    {
      _id: admin._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const generateAccessAndRefreshTokens = async (admin) => {
  try {
    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    admin.refreshToken = refreshToken;
    await admin.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error(`generateAccessAndRefreshTokens - error: ${error.message}`);
    throw new ServerError(500, "Failed to generate tokens.");
  }
};
