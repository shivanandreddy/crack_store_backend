import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Atomically mark user as online and update their activity timestamp on every call
    const user = await User.findByIdAndUpdate(
      decoded.id,
      {
        $set: {
          isLoggedIn: true,
          lastActiveAt: new Date(),
        },
      },
      { new: true }
    ).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "User not found or inactive",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export default protect;