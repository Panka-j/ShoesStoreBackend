import fs from "fs/promises";
import Image from "../../models/imageModel.js";
import ServerError from "../errors/ServerError.js";
import logger from "./logger.js";
import { imgCompress } from "./imgCompress.js";

export const saveImageToDb = async (filePath, originalName, mimeType) => {
  let cleaned = false;
  try {
    logger.info(`saveImageToDb - called for ${originalName}`);
    let compressed;
    try {
      compressed = await imgCompress(filePath, mimeType, {
        maxWidth: 1600,
        maxHeight: 1200,
        quality: 75,
        preferWebp: false,
      });
    } catch (compressErr) {
      logger.warn(
        `saveImageToDb - compression failed (${compressErr.message}), falling back to original file`
      );
    }

    // if compressing succeed use compressed.buffer, else read original file
    let dataBuffer;
    let finalMime = mimeType;
    if (compressed && compressed.buffer) {
      dataBuffer = compressed.buffer;
      finalMime = compressed.mimeType || mimeType;
      logger.info(
        `saveImageToDb - using compressed image (mime: ${finalMime}) for ${originalName}`
      );
    } else {
      dataBuffer = await fs.readFile(filePath);
      logger.info(`saveImageToDb - using original image for ${originalName}`);
    }

    const imageDoc = await Image.create({
      fileName: originalName,
      mimeType: finalMime,
      data: dataBuffer,
    });
    // console.log(imageDoc);

    // remove uploaded temp file
    try {
      await fs.unlink(filePath);
      cleaned = true;
    } catch (unlinkErr) {
      logger.warn(
        `saveImageToDb - could not unlink temp file: ${unlinkErr.message}`
      );
    }

    return imageDoc._id;
  } catch (err) {
    // ensure temp file removed if not already
    if (!cleaned) {
      try {
        await fs.unlink(filePath);
      } catch (e) {
        // ignore - we already logging below
        logger.warn(`saveImageToDb - unlink in catch failed: ${e.message}`);
      }
    }

    logger.error(`saveImageToDb - ${err.message}`);
    throw new ServerError(500, "Failed to save image.");
  }
};
