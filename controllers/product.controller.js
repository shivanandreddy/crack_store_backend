
import Product from "../models/product.model.js";

// ========================================
// CREATE PRODUCT
// ========================================
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      category,
      purchasePrice,
      sellingPrice,
      stockQuantity,
      unit,
      gst,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !sku ||
      !category ||
      purchasePrice === undefined ||
      sellingPrice === undefined
    ) {
      return res.status(400).json({
        message:
          "Name, SKU, category, purchase price and selling price are required",
      });
    }

    // Check duplicate SKU
    const existingProduct = await Product.findOne({
      sku: sku.toUpperCase(),
    });

    if (existingProduct) {
      return res.status(409).json({
        message: "Product with this SKU already exists",
      });
    }

    // Create product
    const product = await Product.create({
      name: name.trim(),
      sku: sku.toUpperCase().trim(),
      category: category.trim(),
      purchasePrice,
      sellingPrice,
      stockQuantity: stockQuantity || 0,
      unit: unit || "piece",
      gst: gst || 0,
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create Product Error:", error);

    return res.status(500).json({
      message: "Failed to create product",
      error: error.message,
    });
  }
};


// ========================================
// GET ALL PRODUCTS
// ========================================
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);

    return res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};


// ========================================
// GET PRODUCT BY ID
// ========================================
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      product,
    });
  } catch (error) {
    console.error("Get Product Error:", error);

    return res.status(500).json({
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};


// ========================================
// UPDATE PRODUCT
// ========================================
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      sku,
      category,
      purchasePrice,
      sellingPrice,
      stockQuantity,
      unit,
      gst,
      isActive,
    } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Check SKU if it is being changed
    if (sku && sku.toUpperCase() !== product.sku) {
      const existingProduct = await Product.findOne({
        sku: sku.toUpperCase(),
        _id: { $ne: id },
      });

      if (existingProduct) {
        return res.status(409).json({
          message: "Another product already uses this SKU",
        });
      }

      product.sku = sku.toUpperCase().trim();
    }

    // Update fields only when provided
    if (name !== undefined) {
      product.name = name.trim();
    }

    if (category !== undefined) {
      product.category = category.trim();
    }

    if (purchasePrice !== undefined) {
      product.purchasePrice = purchasePrice;
    }

    if (sellingPrice !== undefined) {
      product.sellingPrice = sellingPrice;
    }

    if (stockQuantity !== undefined) {
      product.stockQuantity = stockQuantity;
    }

    if (unit !== undefined) {
      product.unit = unit;
    }

    if (gst !== undefined) {
      product.gst = gst;
    }

    if (isActive !== undefined) {
      product.isActive = isActive;
    }

    await product.save();

    return res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update Product Error:", error);

    return res.status(500).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
};


// ========================================
// DELETE PRODUCT
// ========================================
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Soft delete
    product.isActive = false;

    await product.save();

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete Product Error:", error);

    return res.status(500).json({
      message: "Failed to delete product",
      error: error.message,
    });
  }
};
