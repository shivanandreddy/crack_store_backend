
import express from "express";
import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";
import {
  createBill,
  getBills,
  getBillById,
  updateBill
} from "../controllers/bill.controller.js";

const router = express.Router();
// ========================================
// CREATE BILL
// Admin + User
// ========================================
router.post("/", protect, authorize("admin", "user"), createBill);

// ========================================
// GET ALL BILLS
// Admin + User
// ========================================
router.get("/", protect, authorize("admin", "user"), getBills);

// ========================================
// GET BILL BY ID
// Admin + User
// ========================================
router.get("/:id", protect, authorize("admin", "user"), getBillById);



router.put("/:id", protect,authorize("admin") , updateBill);

export default router;
