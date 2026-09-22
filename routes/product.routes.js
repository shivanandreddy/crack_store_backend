import express from "express";
import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";
import {createProduct,getProducts,getProductById,updateProduct,deleteProduct} from "../controllers/product.controller.js";

const router = express.Router();

router.get("/",protect,authorize("admin","useradmin","user"),getProducts);
router.get("/:id",protect,authorize("admin","useradmin","user"),getProductById);
router.post("/",protect,authorize("admin","useradmin"),createProduct);
router.put("/:id",protect,authorize("admin","useradmin"),updateProduct);
router.delete("/:id",protect,authorize("admin"),deleteProduct);



export default router;