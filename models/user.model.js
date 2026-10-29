import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "useradmin", "user"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isLoggedIn: {
      type: Boolean,
      default: false,
    },

    lastActiveAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: false, // Ensures fields outside or dynamically assigned are never stripped
  }
);

const User = mongoose.model("User", userSchema);

export default User;