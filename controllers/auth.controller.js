import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    {
      id: userId,
      role: role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
};

// ===============================
// REGISTER
// ===============================
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // Check existing user
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Allow only valid roles
    const allowedRoles = ["admin", "useradmin", "user"];

    const userRole = role || "user";

    if (!allowedRoles.includes(userRole)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// ===============================
// LOGIN
// ===============================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account is inactive",
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Direct database write with $set guarantees persistence on existing documents
    await User.findByIdAndUpdate(user._id, {
      $set: {
        isLoggedIn: true,
        lastActiveAt: new Date(),
      },
    });

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ===============================
// LOGOUT
// ===============================
export const logout = async (req, res) => {
  try {
    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        isLoggedIn: false,
        lastActiveAt: new Date(),
      });
    }

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      message: "Server error during logout",
      error: error.message,
    });
  }
};

// ===============================
// GET ACTIVE USERS
// ===============================
// ===============================
// GET ACTIVE USERS
// ===============================
export const getActiveUsers = async (req, res) => {
  try {
    // 15 minutes window
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Fetch all active users from database directly as plain JavaScript objects
    const allUsers = await User.find({ isActive: true })
      .select("name email role isLoggedIn lastActiveAt")
      .lean();

    // Map through users to ensure fields are always populated even if old records didn't have them
    const normalizedUsers = allUsers.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isLoggedIn: Boolean(u.isLoggedIn),
      lastActiveAt: u.lastActiveAt || null,
    }));

    // Filter active users: must be marked isLoggedIn AND lastActiveAt within 15 minutes
    const activeUsers = normalizedUsers.filter((u) => {
      if (!u.isLoggedIn || !u.lastActiveAt) return false;
      return new Date(u.lastActiveAt) >= fifteenMinutesAgo;
    });

    res.status(200).json({
      count: activeUsers.length,
      activeUsers,
      allUsers: normalizedUsers,
    });
  } catch (error) {
    console.error("Get Active Users Error:", error);
    res.status(500).json({
      message: "Failed to retrieve active users",
      error: error.message,
    });
  }
};