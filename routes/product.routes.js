import express from "express";
import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const router = express.Router();




// Get all products
router.get(
  "/",
  protect,
  authorize("admin", "useradmin", "user"),
  (req, res) => {
    res.json({
      message: "Get products API working",
    });
  }
);

// Get single product
router.get(
  "/:id",
  protect,
  authorize("admin", "useradmin", "user"),
  (req, res) => {
    res.json({
      message: "Get single product API working",
    });
  }
);

// Add product
// Admin + UserAdmin
router.post(
  "/",
  protect,
  authorize("admin", "useradmin"),
  (req, res) => {
    res.json({
      message: "Add product API working",
    });
  }
);

// Update product
// Admin + UserAdmin
router.put(
  "/:id",
  protect,
  authorize("admin", "useradmin"),
  (req, res) => {
    res.json({
      message: "Update product API working",
    });
  }
);

// Delete product
// Admin only
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  (req, res) => {
    res.json({
      message: "Delete product API working",
    });
  }
);

export default router;