import express from "express";
import protect from "../middleware/auth.middleware.js";
import {
  downloadBillsReport,
  downloadItemWiseSalesReport,
  downloadInventoryReport,
} from "../controllers/report.controller.js";

const router = express.Router();

router.get("/bills", protect, downloadBillsReport);
router.get("/item-sales", protect, downloadItemWiseSalesReport);
router.get("/inventory", protect, downloadInventoryReport);

export default router;