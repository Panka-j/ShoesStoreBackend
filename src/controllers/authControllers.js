import User from "../models/userModel.js";
import ServerError from "../common/errors/ServerError.js";
import ServerResponse from "../common/utils/ServerResponse.js";
import wrapAsync from "../common/utils/wrapAsync.js";
import { hashPassword, comparePassword } from "../common/utils/authHelper.js";
import { generateAccessAndRefreshTokens } from "../common/utils/jwtHelper.js";
import { cookieOptions } from "../constants.js";
import jwt from "jsonwebtoken";

const ACCESS_MAX_AGE = 24 * 60 * 60 * 1000;
const REFRESH_MAX_AGE = 10 * 24 * 60 * 60 * 1000;

export const register = wrapAsync(async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;

  const exists = await User.findOne({ email });
  if (exists) throw new ServerError(409, "Email already registered.");

  const hashedPassword = await hashPassword(password);
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: role || "buyer",
  });

  const created = await User.findById(user._id);
  return res
    .status(201)
    .json(new ServerResponse(201, created, "Registration successful."));
});

export const login = wrapAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user) throw new ServerError(401, "Invalid email or password.");

  if (user.isBlocked) throw new ServerError(401, "Account is blocked.");

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) throw new ServerError(401, "Invalid email or password.");

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user);

  const userDoc = await User.findById(user._id);

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_MAX_AGE,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_MAX_AGE,
    })
    .json(
      new ServerResponse(
        200,
        { user: userDoc, accessToken },
        "Login successful."
      )
    );
});

export const logout = wrapAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 },
  });

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ServerResponse(200, null, "Logged out successfully."));
});

export const refreshToken = wrapAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ServerError(401, "Unauthorized: no refresh token.");

  const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

  const user = await User.findById(decoded._id).select("+refreshToken");
  if (!user) throw new ServerError(401, "Unauthorized: invalid token.");
  if (user.isBlocked) throw new ServerError(401, "Account is blocked.");
  if (user.refreshToken !== token)
    throw new ServerError(401, "Unauthorized: token mismatch.");

  const { accessToken, refreshToken: newRefresh } =
    await generateAccessAndRefreshTokens(user);

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_MAX_AGE,
    })
    .cookie("refreshToken", newRefresh, {
      ...cookieOptions,
      maxAge: REFRESH_MAX_AGE,
    })
    .json(new ServerResponse(200, { accessToken }, "Token refreshed."));
});

export const getMe = wrapAsync(async (req, res) => {
  return res
    .status(200)
    .json(new ServerResponse(200, req.user, "Profile fetched."));
});
