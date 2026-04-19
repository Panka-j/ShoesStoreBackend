import mongoose from "mongoose";
import Image from "../models/imageModel.js";
import logger from "../common/utils/logger.js";
import ServerError from "../common/errors/serverError.js";

export const getImageById = async (req, res) => {
  const i_id = req.params.i_id;
  if (!mongoose.Types.ObjectId.isValid(i_id)) {
    logger.warn(`getImageById - Invalid image id: ${i_id}`);
    throw new ServerError(400, "Invalid image ID.");
  }

  const image = await Image.findById(i_id);
  if (!image) {
    logger.error(`getImageById - Image not found`);
    throw new ServerError(404, "Image not found.");
  }

  logger.info(`getImageById - Image sent successfully id: ${i_id}`);
  res.set("Content-Type", image.mimeType);
  res.send(image.data);
};
