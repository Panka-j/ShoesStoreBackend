import ServerError from "../common/errors/ServerError.js";

export const authorizeRoles =
  (...roles) =>
  (req, _, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new ServerError(
        403,
        `Forbidden: requires role ${roles.join(" or ")}.`
      );
    }
    next();
  };
