import ServerError from "../common/errors/ServerError.js";
import logger from "../common/utils/logger.js";

export const validateRequest = (schema) => {
  return async (req, _, next) => {
    // logger.http(`validateRequest – validating ${req.method} ${req.originalUrl} payload`);
    logger.http("validateRequest - validating");
    try {
      const validated = await schema.validateAsync(req.body, {
        abortEarly: false,
        convert: true,
      });

      req.body = validated;

      logger.info(
        `validateRequest - validation passed for ${req.method} ${req.originalUrl}`
      );
      next();
    } catch (validationError) {
      const errors = validationError.details
        ? validationError.details.map((err) => err.message).join(", ")
        : validationError.message;
      logger.warn(`validateRequest - validation failed: ${errors}`);
      throw new ServerError(400, errors);
    }
  };
};
