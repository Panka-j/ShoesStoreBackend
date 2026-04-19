import ServerError from "../common/errors/serverError.js";
import wrapAsync from "../common/utils/wrapAsync.js";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import logger from "../common/utils/logger.js";

export const verifyAccessJWT = wrapAsync(async (req, _, next) => {
  logger.http(
    `verifyAccessJWT called - cookies: ${JSON.stringify(req.cookies)}`
  );
  // logger.http("verifyAccessJWT called");
  // console.log("req.cookies:", req.cookies);

  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    logger.warn("verifyAccessJWT - no token provided");
    throw new ServerError(401, "Unauthorized: no token provided.");
  }

  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  const user = await User.findById(decodedToken?._id); // this _id is obtained because we sent the user._id in generateAccessToken()
  if (!user) {
    logger.error(
      `verifyAccessJWT - user not found for id - ${decodedToken._id}`
    );
    throw new ServerError(401, "Unauthorized: invalid token.");
  }

  if (!user.isUserVerified) {
    logger.error(`verifyAccessJWT - not a verified user - ${user._id}`);
    throw new ServerError(401, "Unauthorized: account not verified.");
  }

  if (user.isBlocked) {
    logger.error(`verifyAccessJWT - User id blocked, access denied`);
    throw new ServerError(401, "Unauthorized: account is blocked.");
  }

  logger.info(`verifyAccessJWT - user ${user._id} authenticated for resources`);
  req.user = user;
  next();
});
