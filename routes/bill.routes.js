
import express from "express";
import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const router = express.Router();
// Create bill
// Admin + User
router.post(
  "/",
  protect,
  authorize("admin", "user"),
  (req, res) => {
    res.json({
      message: "Create bill API working",
    });
  }
);

// Get all bills
// Admin + User
router.get(
  "/",
  protect,
  authorize("admin", "user"),
  (req, res) => {
    res.json({
      message: "Get bills API working",
    });
  }
);

// Get single bill
// Admin + User
router.get(
  "/:id",
  protect,
  authorize("admin", "user"),
  (req, res) => {
    res.json({
      message: "Get single bill API working",
    });
  }
);

export default router;