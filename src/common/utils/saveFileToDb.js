import fs from "fs/promises";
import File from "../../models/fileModel.js";
import ServerError from "../errors/ServerError.js";
import logger from "./logger.js";

export const saveFileToDb = async (filePath, originalName, mimeType) => {
  let cleaned = false;
  try {
    logger.info(`saveFileToDb - called for ${originalName}`);

    // read file buffer (no compression for generic files)
    let dataBuffer;
    try {
      dataBuffer = await fs.readFile(filePath);
      logger.info(`saveFileToDb - read file buffer for ${originalName}`);
    } catch (readErr) {
      logger.error(
        `saveFileToDb - failed to read temp file for ${originalName}: ${readErr.message}`
      );
      throw readErr;
    }

    const fileDoc = await File.create({
      fileName: originalName,
      mimeType: mimeType,
      data: dataBuffer,
    });

    // remove uploaded temp file
    try {
      await fs.unlink(filePath);
      cleaned = true;
      logger.info(`saveFileToDb - removed temp file for ${originalName}`);
    } catch (unlinkErr) {
      logger.warn(
        `saveFileToDb - could not unlink temp file: ${unlinkErr.message}`
      );
    }

    return fileDoc._id;
  } catch (err) {
    // ensure temp file removed if not already
    if (!cleaned) {
      try {
        await fs.unlink(filePath);
      } catch (e) {
        logger.warn(`saveFileToDb - unlink in catch failed: ${e.message}`);
      }
    }

    logger.error(`saveFileToDb - ${err.message}`);
    throw new ServerError(500, "Failed to save file.");
  }
};

export default saveFileToDb;
