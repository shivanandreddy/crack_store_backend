import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import billRoutes from "./routes/bill.routes.js";
import cors from "cors";

dotenv.config();

const app = express();
const port = process.env.PORT;
// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth",authRoutes);
app.use("/api/products",productRoutes);
app.use("/api/bills",billRoutes);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  connectDB();
});