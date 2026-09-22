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
const allowedOrigins = [
  "http://localhost:5173",
  "https://crackerstorefrontend.vercel.app/"
];
// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile apps, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth",authRoutes);
app.use("/api/products",productRoutes);
app.use("/api/bills",billRoutes);

//health check
app.get("/", (req, res) => {
  res.send(`Server is running ${port}`);
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  connectDB();
});