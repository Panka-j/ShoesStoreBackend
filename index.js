import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import connectDB from "./src/common/db/connection.js";
import logger from "./src/common/utils/logger.js";

import imageRouter from "./src/routes/imageRoutes.js";
import authRouter from "./src/routes/authRoutes.js";
import userRouter from "./src/routes/userRoutes.js";
import categoryRouter from "./src/routes/categoryRoutes.js";
import productRouter from "./src/routes/productRoutes.js";
import orderRouter from "./src/routes/orderRoutes.js";
import reviewRouter from "./src/routes/reviewRoutes.js";

import { errorHandler } from "./src/middlewares/errorMiddlewares.js";

// Load env
dotenv.config({ path: "./.env" });

const app = express();
const port = process.env.PORT || 8000;
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

if (!isProd) {
  app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms", {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );
}

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.CORS_ORIGIN,
      process.env.CORS_ORIGIN_RENDER,
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/v1/image", imageRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/reviews", reviewRouter);

app.get("/health", (req, res) => {
  res.status(200).json({ message: `Backend healthy at port => ${port}` });
});

app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`\n Server running on port => ${port}`);
    });
  })
  .catch((err) => console.log("DB connection failed => ", err));
