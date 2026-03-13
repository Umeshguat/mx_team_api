const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
const register = async (req, res) => {
  try {
    const {
      full_name,
      email,
      role_id,
      designation_id,
      headquarter_name,
      phone_number,
      password,
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      full_name,
      email,
      role_id,
      designation_id,
      headquarter_name,
      phone_number,
      password,
    });

    res.status(201).json({
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      role_id: user.role_id,
      designation_id: user.designation_id,
      headquarter_name: user.headquarter_name,
      phone_number: user.phone_number,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/users/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt for email:", email);
    const user = await User.findOne({ email })
      .populate("role_id", "role_name")
      .populate("designation_id", "designation_name");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      role_id: user.role_id?._id || user.role_id,
      role_name: user.role_id?.role_name || null,
      designation_id: user.designation_id?._id || user.designation_id,
      designation_name: user.designation_id?.designation_name || null,
      headquarter_name: user.headquarter_name,
      phone_number: user.phone_number,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.full_name = req.body.full_name || user.full_name;
    user.email = req.body.email || user.email;
    user.role_id = req.body.role_id || user.role_id;
    user.designation_id = req.body.designation_id || user.designation_id;
    user.headquarter_name = req.body.headquarter_name || user.headquarter_name;
    user.phone_number = req.body.phone_number || user.phone_number;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      full_name: updatedUser.full_name,
      email: updatedUser.email,
      role_id: updatedUser.role_id,
      designation_id: updatedUser.designation_id,
      headquarter_name: updatedUser.headquarter_name,
      phone_number: updatedUser.phone_number,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, updateProfile };
