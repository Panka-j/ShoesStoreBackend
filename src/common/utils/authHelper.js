import bcrypt from "bcrypt";
import ServerError from "../errors/ServerError.js";
import logger from "./logger.js";

const SALT_ROUNDS = 10;

// hashes a plain-text password
export const hashPassword = async (password) => {
  if (typeof password !== "string" || password.trim().length === 0) {
    throw new ServerError(400, "Password must be a non-empty string.");
  }

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (err) {
    logger.error(`hashPassword - hashing failed: ${err.message}`);
    throw new ServerError(
      500,
      "Failed to hash password.",
      [{ issue: err.message }],
      err.stack
    );
  }
};

// compares plain-text password against hashed string
export const comparePassword = async (password, hashed) => {
  if (
    typeof password !== "string" ||
    password.trim().length === 0 ||
    typeof hashed !== "string" ||
    hashed.trim().length === 0
  ) {
    throw new ServerError(400, "Password and hash must be non-empty strings.");
  }

  try {
    const isMatch = await bcrypt.compare(password, hashed);
    return isMatch;
  } catch (err) {
    logger.error(`comparePassword - comparison failed: ${err.message}`);
    throw new ServerError(
      500,
      "Failed to compare passwords.",
      [{ issue: err.message }],
      err.stack
    );
  }
};
