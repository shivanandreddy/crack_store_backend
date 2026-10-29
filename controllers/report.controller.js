import Bill from "../models/bill.model.js";
import Product from "../models/product.model.js";




// Helper function to escape CSV cells
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
};

// =================================================================
// 1. BILLS / SALES SUMMARY REPORT
// Route: GET /api/reports/bills?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&paymentMethod=cash
// =================================================================
export const downloadBillsReport = async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod, createdBy } = req.query;

    const filter = {};

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod.toLowerCase();
    }

    if (createdBy) {
      filter.createdBy = createdBy;
    }

    const bills = await Bill.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const headers = [
      "Bill Number",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Total Items",
      "Subtotal (INR)",
      "Discount (INR)",
      "Grand Total (INR)",
      "Payment Method",
      "Billed By",
    ];

    const rows = bills.map((bill) => {
      const totalItemsCount = bill.items.reduce(
        (acc, item) => acc + (item.quantity || 0),
        0
      );

      return [
        escapeCSV(bill.billNumber),
        escapeCSV(new Date(bill.createdAt).toLocaleDateString("en-IN")),
        escapeCSV(bill.customerName || "Walk-in Customer"),
        escapeCSV(bill.customerPhone || "-"),
        escapeCSV(totalItemsCount),
        escapeCSV(Number(bill.subtotal || 0).toFixed(2)),
        escapeCSV(Number(bill.discount || 0).toFixed(2)),
        escapeCSV(Number(bill.grandTotal || 0).toFixed(2)),
        escapeCSV(bill.paymentMethod?.toUpperCase()),
        escapeCSV(bill.createdBy?.name || "-"),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=bills_report_${Date.now()}.csv`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Download Bills Report Error:", error);
    return res.status(500).json({
      message: "Failed to generate bills report",
      error: error.message,
    });
  }
};

// =================================================================
// 2. DETAILED ITEM-WISE SALES REPORT
// Route: GET /api/reports/item-sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// =================================================================
export const downloadItemWiseSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const bills = await Bill.find(filter)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    const headers = [
      "Bill Number",
      "Date",
      "Product Name",
      "Quantity Sold",
      "Unit Price (INR)",
      "Total Price (INR)",
      "Customer",
      "Payment Mode",
      "Billed By",
    ];

    const rows = [];

    bills.forEach((bill) => {
      bill.items.forEach((item) => {
        rows.push(
          [
            escapeCSV(bill.billNumber),
            escapeCSV(new Date(bill.createdAt).toLocaleDateString("en-IN")),
            escapeCSV(item.name),
            escapeCSV(item.quantity),
            escapeCSV(Number(item.price || 0).toFixed(2)),
            escapeCSV(Number(item.total || 0).toFixed(2)),
            escapeCSV(bill.customerName || "Walk-in"),
            escapeCSV(bill.paymentMethod?.toUpperCase()),
            escapeCSV(bill.createdBy?.name || "-"),
          ].join(",")
        );
      });
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=item_sales_report_${Date.now()}.csv`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Download Item-Wise Sales Report Error:", error);
    return res.status(500).json({
      message: "Failed to generate item-wise report",
      error: error.message,
    });
  }
};

// =================================================================
// 3. INVENTORY & STOCK VALUATION REPORT
// Route: GET /api/reports/inventory?category=Crackers
// =================================================================
export const downloadInventoryReport = async (req, res) => {
  try {
    const { category, isActive } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const products = await Product.find(filter).sort({ name: 1 });

    const headers = [
      "Product Name",
      "SKU",
      "Category",
      "Unit",
      "Stock Quantity",
      "Purchase Price (INR)",
      "Selling Price (INR)",
      "Stock Value - Purchase (INR)",
      "Stock Value - Retail (INR)",
      "Est. Profit Margin (INR)",
      "GST %",
      "Status",
    ];

    const rows = products.map((prod) => {
      const stockValPurchase = (prod.stockQuantity || 0) * (prod.purchasePrice || 0);
      const stockValSelling = (prod.stockQuantity || 0) * (prod.sellingPrice || 0);
      const profitMarginPerUnit = (prod.sellingPrice || 0) - (prod.purchasePrice || 0);

      return [
        escapeCSV(prod.name),
        escapeCSV(prod.sku),
        escapeCSV(prod.category),
        escapeCSV(prod.unit || "piece"),
        escapeCSV(prod.stockQuantity),
        escapeCSV(Number(prod.purchasePrice || 0).toFixed(2)),
        escapeCSV(Number(prod.sellingPrice || 0).toFixed(2)),
        escapeCSV(stockValPurchase.toFixed(2)),
        escapeCSV(stockValSelling.toFixed(2)),
        escapeCSV(profitMarginPerUnit.toFixed(2)),
        escapeCSV(prod.gst || 0),
        escapeCSV(prod.isActive ? "Active" : "Inactive"),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=inventory_report_${Date.now()}.csv`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Download Inventory Report Error:", error);
    return res.status(500).json({
      message: "Failed to generate inventory report",
      error: error.message,
    });
  }
};