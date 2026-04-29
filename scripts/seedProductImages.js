/**
 * Fetch real shoe stock photos from Pexels and add 2 per product.
 * Run from project root: node scripts/seedProductImages.js
 *
 * Requires PEXELS_API_KEY in .env  (free at https://www.pexels.com/api/)
 *
 * Flags:
 *   --force   Delete existing product images and re-fetch
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import sharp from "sharp";

import Product from "../src/models/productModel.js";
import Image from "../src/models/imageModel.js";

dotenv.config({ path: "./.env" });

const FORCE = process.argv.includes("--force");
const IMAGES_PER_PRODUCT = 2;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!PEXELS_API_KEY) {
  console.error("✗ PEXELS_API_KEY is not set in .env");
  console.error(
    "  Get a free key at https://www.pexels.com/api/ and add it to .env"
  );
  process.exit(1);
}

// Fetch a pool of shoe photo URLs from Pexels
async function fetchShoePhotoPool(needed) {
  const perPage = Math.min(Math.max(needed, 20), 80);
  const { data } = await axios.get("https://api.pexels.com/v1/search", {
    headers: { Authorization: PEXELS_API_KEY },
    params: { query: "shoes sneakers", per_page: perPage, page: 1 },
  });

  const urls = data.photos.map((p) => p.src.large);
  if (urls.length < needed) {
    // Fetch a second page if the first page wasn't enough
    const { data: data2 } = await axios.get(
      "https://api.pexels.com/v1/search",
      {
        headers: { Authorization: PEXELS_API_KEY },
        params: { query: "shoes sneakers", per_page: perPage, page: 2 },
      }
    );
    urls.push(...data2.photos.map((p) => p.src.large));
  }

  return urls;
}

async function fetchAndCompress(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return sharp(Buffer.from(response.data))
    .resize({
      width: 800,
      height: 600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 75 })
    .toBuffer();
}

const stats = { processed: 0, skipped: 0, failed: 0 };

try {
  await mongoose.connect(`${process.env.MONGODB_URL}/ShoeStore`);
  console.log("✓ Connected to MongoDB\n");

  const products = await Product.find({});
  console.log(`Found ${products.length} product(s)`);

  const eligible = FORCE
    ? products
    : products.filter((p) => p.images.length < IMAGES_PER_PRODUCT);

  const skippedCount = products.length - eligible.length;
  if (skippedCount > 0) {
    console.log(
      `Skipping ${skippedCount} product(s) that already have images (use --force to overwrite)\n`
    );
    stats.skipped = skippedCount;
  }

  if (eligible.length === 0) {
    console.log("Nothing to do.");
  } else {
    // Fetch enough unique shoe photos upfront
    const needed = eligible.length * IMAGES_PER_PRODUCT;
    console.log(`Fetching ${needed} shoe photos from Pexels...\n`);
    const photoPool = await fetchShoePhotoPool(needed);

    if (photoPool.length < needed) {
      console.warn(
        `  ! Only got ${photoPool.length} photos from Pexels (needed ${needed}). Some products may share photos.`
      );
    }

    for (let pi = 0; pi < eligible.length; pi++) {
      const product = eligible[pi];

      if (FORCE && product.images.length > 0) {
        await Image.deleteMany({ _id: { $in: product.images } });
        product.images = [];
      }

      const savedIds = [];
      try {
        for (let i = 0; i < IMAGES_PER_PRODUCT; i++) {
          const url =
            photoPool[(pi * IMAGES_PER_PRODUCT + i) % photoPool.length];
          const buffer = await fetchAndCompress(url);
          const imageDoc = await Image.create({
            fileName: `${product.slug}-${i}.jpg`,
            mimeType: "image/jpeg",
            data: buffer,
          });
          savedIds.push(imageDoc._id);
        }

        product.images.push(...savedIds);
        await product.save();

        console.log(
          `  ✓ "${product.name}" — ${IMAGES_PER_PRODUCT} images added`
        );
        stats.processed++;
      } catch (err) {
        stats.failed++;
        console.error(`  ✗ Failed for "${product.name}": ${err.message}`);
        if (savedIds.length > 0) {
          await Image.deleteMany({ _id: { $in: savedIds } }).catch(() => {});
        }
      }
    }
  }
} finally {
  console.log(`
─── Summary ──────────────────────────
  Processed : ${stats.processed}
  Skipped   : ${stats.skipped}
  Failed    : ${stats.failed}
──────────────────────────────────────`);
  await mongoose.disconnect();
  console.log("✓ Disconnected from MongoDB");
}
