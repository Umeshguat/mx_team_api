const User = require("../models/userModel");
const UserDailyAllowance = require("../models/userAllowanceDailyReceiveModel");
const Attendance = require("../models/attendanceModel");
const VendorVisit = require("../models/vendorVisitModel");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

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

// @desc    Get daily allowances by logged-in user
// @route   GET /api/users/daily-allowance
const getDailyAllowanceByUser = async (req, res) => {
  try {
    const userId = req.user._id;

    const dailyAllowances = await UserDailyAllowance.find({ user_id: userId })
      .populate("user_id", "full_name")
      .sort({ date: -1 });

    // Calculate total approved and pending amounts
    let total_approved_amount = 0;
    let total_pending_amount = 0;

    dailyAllowances.forEach((item) => {
      const amount = item.total_km_price + item.food + item.stay + item.other + item.daily;
      if (item.status === "approved") {
        total_approved_amount += amount;
      } else if (item.status === "pending") {
        total_pending_amount += amount;
      }
    });

    res.status(200).json({
      status: 200,
      message: "Daily allowances fetched successfully",
      total_approved_amount,
      total_pending_amount,
      dailyAllowances,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get user details (profile + today's check-in, vendor visits, allowance)
// @route   GET /api/users/details
const getUserDetails = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select("full_name email headquarter_name phone_number")

    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found" });
    }

    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's attendance
    const attendance = await Attendance.findOne({
      user_id: userId,
      check_in_time: { $gte: today, $lt: tomorrow },
    }).sort({ check_in_time: -1 });

    const check_in_time = attendance && attendance.check_in_time
      ? attendance.check_in_time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
      : "Not checked in";

    // Today's vendor visits count
    const vendor_visits = await VendorVisit.countDocuments({
      user_id: userId,
      visit_date: { $gte: today, $lt: tomorrow },
    });

    // Today's total allowance
    const allowanceResult = await UserDailyAllowance.aggregate([
      {
        $match: {
          user_id: userId,
          date: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          total_km_price: { $sum: "$total_km_price" },
          total_food: { $sum: "$food" },
          total_stay: { $sum: "$stay" },
          total_other: { $sum: "$other" },
          total_daily: { $sum: "$daily" },
        },
      },
    ]);

    const total_allowance =
      allowanceResult.length > 0
        ? allowanceResult[0].total_km_price +
          allowanceResult[0].total_food +
          allowanceResult[0].total_stay +
          allowanceResult[0].total_other +
          allowanceResult[0].total_daily
        : 0;

    res.status(200).json({
      status: 200,
      message: "User details fetched successfully",
      data: {
        full_name: user.full_name,
        email: user.email,
        headquarter_name: user.headquarter_name,
        phone_number: user.phone_number,
        check_in_time,
        vendor_visits,
        total_allowance,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Forgot password - send OTP to email
// @route   POST /api/users/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: 400, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found with this email" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to user
    user.otp = otp;
    user.otp_expires = otpExpires;
    await User.updateOne({ _id: user._id }, { otp, otp_expires: otpExpires });

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      html: `<p>Your OTP for password reset is: <b>${otp}</b></p><p>This OTP is valid for 10 minutes.</p>`,
    });

    res.status(200).json({ status: 200, message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/users/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ status: 400, message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found" });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ status: 400, message: "Invalid OTP" });
    }

    if (user.otp_expires < new Date()) {
      return res.status(400).json({ status: 400, message: "OTP has expired" });
    }

    res.status(200).json({ status: 200, message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Reset password after OTP verification
// @route   POST /api/users/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({ status: 400, message: "Email, OTP, and new password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found" });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ status: 400, message: "Invalid OTP" });
    }

    if (user.otp_expires < new Date()) {
      return res.status(400).json({ status: 400, message: "OTP has expired" });
    }

    // Update password and clear OTP
    user.password = new_password;
    user.otp = null;
    user.otp_expires = null;
    await user.save();

    res.status(200).json({ status: 200, message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

module.exports = { register, login, updateProfile, getDailyAllowanceByUser, getUserDetails, forgotPassword, verifyOtp, resetPassword };
