import mongoose from "mongoose";
import { DB_NAME } from "../../constants.js";
import logger from "../utils/logger.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    // console.log(
    //   `\n MongoDB connected !! DB Host => ${connectionInstance.connection.host}`
    // );
    logger.info(
      `MongoDB connected — Host: ${connectionInstance.connection.host}, DB: ${DB_NAME}`
    );
  } catch (error) {
    // console.error("MongoDB connection failed => ", error);
    logger.error("MongoDB connection failed", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export default connectDB;
