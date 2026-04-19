import logger from "../common/utils/logger.js";
import ServerError from "../common/errors/ServerError.js";

export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors = [];

  if (err instanceof ServerError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else {
    // Log unexpected errors
    logger.error(`Unhandled Error - ${err.stack || err}`);
  }

  return res.status(statusCode).json({
    statusCode,
    success: statusCode < 400,
    data: null,
    message,
    errors,
  });
};
