import mongoose from "mongoose";
import User from "../models/userModel.js";
import ServerError from "../common/errors/ServerError.js";
import ServerResponse from "../common/utils/ServerResponse.js";
import wrapAsync from "../common/utils/wrapAsync.js";
import { hashPassword, comparePassword } from "../common/utils/authHelper.js";
import { saveImageToDb } from "../common/utils/saveImageToDb.js";

// ─── Admin controllers ───────────────────────────────────────────────────────

export const adminListUsers = wrapAsync(async (req, res) => {
  const { role, isBlocked, search, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (isBlocked !== undefined) filter.isBlocked = isBlocked === "true";
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ServerResponse(
      200,
      {
        items: users,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
      "Users fetched."
    )
  );
});

export const adminGetUser = wrapAsync(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw new ServerError(404, "User not found.");
  return res.status(200).json(new ServerResponse(200, user, "User fetched."));
});

export const adminUpdateUser = wrapAsync(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, req.body, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new ServerError(404, "User not found.");
  return res.status(200).json(new ServerResponse(200, user, "User updated."));
});

export const adminDeleteUser = wrapAsync(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.userId);
  if (!user) throw new ServerError(404, "User not found.");
  return res.status(200).json(new ServerResponse(200, null, "User deleted."));
});

export const adminBlockUser = wrapAsync(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { isBlocked: true },
    { new: true }
  );
  if (!user) throw new ServerError(404, "User not found.");
  return res.status(200).json(new ServerResponse(200, user, "User blocked."));
});

export const adminUnblockUser = wrapAsync(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { isBlocked: false },
    { new: true }
  );
  if (!user) throw new ServerError(404, "User not found.");
  return res.status(200).json(new ServerResponse(200, user, "User unblocked."));
});

export const adminChangeRole = wrapAsync(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { role: req.body.role },
    { new: true }
  );
  if (!user) throw new ServerError(404, "User not found.");
  return res.status(200).json(new ServerResponse(200, user, "Role updated."));
});

// ─── Own-profile controllers ─────────────────────────────────────────────────

export const getMyProfile = wrapAsync(async (req, res) => {
  return res
    .status(200)
    .json(new ServerResponse(200, req.user, "Profile fetched."));
});

export const updateMyProfile = wrapAsync(async (req, res) => {
  const allowedFields = ["firstName", "lastName", "phone", "address"];
  const updates = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  return res
    .status(200)
    .json(new ServerResponse(200, user, "Profile updated."));
});

export const changePassword = wrapAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) throw new ServerError(400, "Current password is incorrect.");

  user.password = await hashPassword(newPassword);
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ServerResponse(200, null, "Password changed."));
});

export const deleteMyAccount = wrapAsync(async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  return res
    .status(200)
    .json(new ServerResponse(200, null, "Account deleted."));
});

export const updateAvatar = wrapAsync(async (req, res) => {
  if (!req.file) throw new ServerError(400, "No image file provided.");

  const imageId = await saveImageToDb(
    req.file.path,
    req.file.originalname,
    req.file.mimetype
  );

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: imageId },
    { new: true }
  );
  return res.status(200).json(new ServerResponse(200, user, "Avatar updated."));
});
