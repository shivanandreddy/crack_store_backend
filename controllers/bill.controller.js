

import Bill from "../models/bill.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";

// ========================================
// GENERATE BILL NUMBER
// ========================================
const generateBillNumber = async () => {
  const count = await Bill.countDocuments();

  const number = String(count + 1).padStart(4, "0");

  return `INV-${new Date().getFullYear()}-${number}`;
};


// ========================================
// CREATE BILL
// ========================================
export const createBill = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      items,
      discount = 0,
      paymentMethod,
    } = req.body;

    // --------------------------------
    // Validate request
    // --------------------------------
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "At least one product is required",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        message: "Payment method is required",
      });
    }

    const allowedPaymentMethods = [
      "cash",
      "upi",
      "card",
      "credit"
    ];

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    // --------------------------------
    // Validate discount
    // --------------------------------
    if (discount < 0) {
      return res.status(400).json({
        message: "Discount cannot be negative",
      });
    }

    const billItems = [];

    let subtotal = 0;

    // --------------------------------
    // Check products and stock
    // --------------------------------
    for (const item of items) {
      if (!item.productId || !item.quantity) {
        return res.status(400).json({
          message: "Product ID and quantity are required",
        });
      }

      if (item.quantity <= 0) {
        return res.status(400).json({
          message: "Quantity must be greater than 0",
        });
      }

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.productId}`,
        });
      }

      if (!product.isActive) {
        return res.status(400).json({
          message: `${product.name} is inactive`,
        });
      }

      // Check available stock
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
          availableStock: product.stockQuantity,
          requestedQuantity: item.quantity,
        });
      }

      // Calculate item total
      const itemTotal =
        product.sellingPrice * item.quantity;

      subtotal += itemTotal;

      // Store product information in bill
      billItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.sellingPrice,
        total: itemTotal,
      });
    }

    // --------------------------------
    // Check discount
    // --------------------------------
    if (discount > subtotal) {
      return res.status(400).json({
        message: "Discount cannot be greater than subtotal",
      });
    }

    // --------------------------------
    // Calculate final amount
    // --------------------------------
    const grandTotal = subtotal - discount;

    // --------------------------------
    // Generate bill number
    // --------------------------------
    const billNumber = await generateBillNumber();

    // --------------------------------
    // Create bill
    // --------------------------------
    const bill = await Bill.create({
      billNumber,
      customerName,
      customerPhone,
      items: billItems,
      subtotal,
      discount,
      grandTotal,
      paymentMethod,
      createdBy: req.user._id,
    });

    // --------------------------------
    // Reduce inventory stock
    // --------------------------------
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: {
            stockQuantity: -item.quantity,
          },
        }
      );
    }

    // --------------------------------
    // Response
    // --------------------------------
    return res.status(201).json({
      message: "Bill created successfully",
      bill,
    });

  } catch (error) {
    console.error("Create Bill Error:", error);

    return res.status(500).json({
      message: "Failed to create bill",
      error: error.message,
    });
  }
};


// ========================================
// GET ALL BILLS
// ========================================
export const getBills = async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate("createdBy", "name email role")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      count: bills.length,
      bills,
    });

  } catch (error) {
    console.error("Get Bills Error:", error);

    return res.status(500).json({
      message: "Failed to fetch bills",
      error: error.message,
    });
  }
};


// ========================================
// GET BILL BY ID
// ========================================
export const getBillById = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id)
      .populate("createdBy", "name email role");

    if (!bill) {
      return res.status(404).json({
        message: "Bill not found",
      });
    }

    return res.status(200).json({
      bill,
    });

  } catch (error) {
    console.error("Get Bill Error:", error);

    return res.status(500).json({
      message: "Failed to fetch bill",
      error: error.message,
    });
  }
};



/**
 * @desc    Update / Edit an existing bill and readjust stock
 * @route   PUT /bills/:id
 * @access  Private / Admin
 */
export const updateBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { customerName, customerPhone, items, discount = 0, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "A bill must contain at least one item." });
    }

    // 1. Fetch the existing bill
    const existingBill = await Bill.findById(id).session(session);
    if (!existingBill) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Bill not found." });
    }

    // 2. Revert previous stock quantities back to products
    for (const oldItem of existingBill.items) {
      const prodId = oldItem.productId?._id || oldItem.productId;
      await Product.findByIdAndUpdate(
        prodId,
        { $inc: { stockQuantity: Number(oldItem.quantity) } },
        { session }
      );
    }

    // 3. Validate new items against reverted stock and format strictly to match billItemSchema
    let subtotal = 0;
    const updatedItems = [];

    for (const newItem of items) {
      const product = await Product.findById(newItem.productId).session(session);

      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          message: `Product with ID ${newItem.productId} not found.`,
        });
      }

      const reqQuantity = Number(newItem.quantity);

      // Verify stock availability
      if (product.stockQuantity < reqQuantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Only ${product.stockQuantity} available.`,
        });
      }

      // Deduct new quantity from product stock
      product.stockQuantity -= reqQuantity;
      await product.save({ session });

      const price = Number(newItem.price ?? product.sellingPrice);
      const itemTotal = price * reqQuantity;

      subtotal += itemTotal;

      // Matches your billItemSchema exactly (productId, name, quantity, price, total)
      updatedItems.push({
        productId: product._id,
        name: product.name,
        quantity: reqQuantity,
        price,
        total: itemTotal,
      });
    }

    // 4. Calculate final totals
    const finalDiscount = Math.max(0, Number(discount) || 0);
    const grandTotal = Math.max(0, subtotal - finalDiscount);

    // 5. Update the bill record
    if (customerName !== undefined) existingBill.customerName = customerName.trim();
    if (customerPhone !== undefined) existingBill.customerPhone = customerPhone.trim();
    existingBill.items = updatedItems;
    existingBill.subtotal = subtotal;
    existingBill.discount = finalDiscount;
    existingBill.grandTotal = grandTotal;
    if (paymentMethod) existingBill.paymentMethod = paymentMethod;

    await existingBill.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Bill updated successfully.",
      bill: existingBill,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update Bill Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update bill.",
    });
  }
};