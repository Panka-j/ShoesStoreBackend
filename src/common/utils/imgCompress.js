import sharp from "sharp";
import fs from "fs/promises";
import logger from "./logger.js";

export const imgCompress = async (inputPath, mimeType, opts = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 80,
    preferWebp = false,
  } = opts;

  try {
    const inputBuffer = await fs.readFile(inputPath);
    const pipeline = sharp(inputBuffer, { failOnError: false });
    const meta = await pipeline.metadata().catch(() => ({}));
    const detectedFormat = (meta.format || "").toLowerCase();

    logger.info(
      `imgCompress - inputPath=${inputPath}, mimeType=${mimeType}, detectedFormat=${detectedFormat}, pages=${meta.pages || 1}`
    );

    if (
      (meta.width && meta.width > maxWidth) ||
      (meta.height && meta.height > maxHeight)
    ) {
      pipeline.resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Decide output based on detectedFormat + preferWebp
    // If preferWebp true and input is png/jpeg -> convert to webp
    if (
      preferWebp &&
      (detectedFormat === "png" ||
        detectedFormat === "jpeg" ||
        detectedFormat === "jpg")
    ) {
      const buffer = await pipeline.webp({ quality }).toBuffer();
      return { buffer, mimeType: "image/webp" };
    }

    // If input already webp -> keep webp
    if (detectedFormat === "webp") {
      const buffer = await pipeline.webp({ quality }).toBuffer();
      return { buffer, mimeType: "image/webp" };
    }

    // If input jpeg -> jpeg output
    if (detectedFormat === "jpeg" || detectedFormat === "jpg") {
      const buffer = await pipeline.jpeg({ quality }).toBuffer();
      return { buffer, mimeType: "image/jpeg" };
    }

    // If input png -> png output
    if (detectedFormat === "png") {
      const buffer = await pipeline.png().toBuffer();
      return { buffer, mimeType: "image/png" };
    }

    const fallbackBuf = await pipeline.toBuffer();
    return {
      buffer: fallbackBuf,
      mimeType: mimeType || `image/${detectedFormat || "unknown"}`,
    };
  } catch (err) {
    // If something odd happens, fallback to returning original file buffer
    try {
      const original = await fs.readFile(inputPath);
      return {
        buffer: original,
        mimeType: mimeType || "application/octet-stream",
      };
    } catch (readErr) {
      // If even reading the original fails, rethrow the original error
      throw err;
    }
  }
};
