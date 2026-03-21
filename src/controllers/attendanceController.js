const Attendance = require("../models/attendanceModel");
const User = require("../models/userModel");
const AllowanceMaster = require("../models/allowanceMasterModel");
const UserDailyAllowance = require("../models/userAllowanceDailyReceiveModel");
const { uploadFilesToS3 } = require("../utils/s3Upload");

const S3_FOLDER = "attendance";

// @desc    Check in attendance
// @route   POST /api/attendance/check-in
const checkIn = async (req, res) => {
  console.log("checkIn req.body:", req.body);
  console.log("checkIn req.files:", req.files);
  try {
    const userId = req.user._id;

    // Check if user already has an active check-in (not checked out)
    const activeAttendance = await Attendance.findOne({
      user_id: userId,
      status: "checked_in",
    });

    if (activeAttendance) {
      return res.status(400).json({
        message: "You already have an active check-in. Please check out first.",
      });
    }

    const {
      check_in_km,
      total_km,
      headquarter_name,
      working_town,
      route,
      stay_amount,
      food_amount,
      other_amount,
    } = req.body;

    const files = req.files || {};

    const kmImage = files.check_in_image || files.km_image;
    if (!kmImage || !files.selfie_image) {
      return res.status(400).json({
        message: "Check-in KM image and selfie image are required",
      });
    }

    // Upload all images to S3
    const s3Urls = await uploadFilesToS3(files, S3_FOLDER);

    const attendance = await Attendance.create({
      user_id: userId,
      check_in_time: new Date(),
      check_in_km: check_in_km || total_km,
      check_in_image: s3Urls.check_in_image || s3Urls.km_image,
      selfie_image: s3Urls.selfie_image,
      headquarter_name,
      working_town,
      route,
      stay_image: s3Urls.stay_image || null,
      stay_amount: stay_amount || 0,
      food_amount: food_amount || 0,
      food_image: s3Urls.food_image || null,
      other_amount: other_amount || 0,
      other_image: s3Urls.other_image || null,
    });

    res.status(201).json({
      message: "Check-in successful",
      attendance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check out attendance (auto-finds today's active check-in)
// @route   POST /api/attendance/check-out
const checkOut = async (req, res) => {
  try {

    const userId = req.user._id;

    // Find today's active check-in for this user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      user_id: userId,
      status: "checked_in",
      check_in_time: { $gte: today, $lt: tomorrow },
    });

    if (!attendance) {
      return res.status(404).json({
        message: "No active check-in found for today",
      });
    }

    const { total_km } = req.body;
    const files = req.files || {};

    if (!files.check_out_image) {
      return res.status(400).json({
        message: "Check-out KM image is required",
      });
    }

    // Upload all images to S3
    const s3Urls = await uploadFilesToS3(files, S3_FOLDER);

    attendance.check_out_time = new Date();
    attendance.check_out_km = total_km;
    attendance.check_out_image = s3Urls.check_out_image;
    attendance.status = "checked_out";

    // Update optional expense fields if provided during checkout
    if (s3Urls.stay_image) attendance.stay_image = s3Urls.stay_image;
    if (req.body.stay_amount) attendance.stay_amount = req.body.stay_amount;
    if (req.body.food_amount) attendance.food_amount = req.body.food_amount;
    if (s3Urls.food_image) attendance.food_image = s3Urls.food_image;
    if (req.body.other_amount) attendance.other_amount = req.body.other_amount;
    if (s3Urls.other_image) attendance.other_image = s3Urls.other_image;

    const updatedAttendance = await attendance.save();

    // Calculate total KM
    const total_km_value = attendance.check_out_km - attendance.check_in_km;

    // Get user's designation and fetch allowance master
    const user = await User.findById(userId);
    const allowanceMaster = await AllowanceMaster.findOne({
      designation_id: user.designation_id,
    });

    const per_km = allowanceMaster ? allowanceMaster.per_km : 0;
    const total_km_price = total_km_value * per_km;

    // Create UserDailyAllowance record
    const dailyAllowance = await UserDailyAllowance.create({
      user_id: userId,
      total_km: total_km_value,
      total_km_price,
      food: attendance.food_amount || 0,
      stay: attendance.stay_amount || 0,
      other: attendance.other_amount || 0,
      daily: allowanceMaster ? allowanceMaster.daily_allowance : 0,
      date: new Date(),
    });

    res.json({
      message: "Check-out successful",
      attendance: updatedAttendance,
      dailyAllowance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get today's attendance for logged-in user
// @route   GET /api/attendance/today
const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.find({
      user_id: req.user._id,
      check_in_time: { $gte: today, $lt: tomorrow },
    })
      .select("_id headquarter_name working_town route check_in_time check_out_time check_in_km check_out_km user_id")
      .populate("user_id", "full_name")
      .sort({ check_in_time: -1 });

    const result = attendance.map((item) => {
      const startTime = item.check_in_time
        ? item.check_in_time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
        : null;
      const endTime = item.check_out_time
        ? item.check_out_time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
        : null;
      return {
        _id: item._id,
        full_name: item.user_id?.full_name || null,
        headquarter_name: item.headquarter_name,
        working_town: item.working_town,
        route: item.route,
        date: item.check_in_time,
        start_time: startTime,
        end_time: endTime,
        total_km: item.check_out_km ? item.check_out_km - item.check_in_km : 0,
      };
    });

    res.json({ status: 200, attendance: result });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get attendance history for logged-in user
// @route   GET /api/attendance/history
const getAttendanceHistory = async (req, res) => {
  try {
    const attendance = await Attendance.find({
      user_id: req.user._id,
    })
      .select("_id headquarter_name working_town route check_in_time check_out_time check_in_km check_out_km user_id")
      .populate("user_id", "full_name")
      .sort({ check_in_time: -1 });

    const result = attendance.map((item) => {
      const startTime = item.check_in_time
        ? item.check_in_time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
        : null;
      const endTime = item.check_out_time
        ? item.check_out_time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
        : null;
      return {
        _id: item._id,
        full_name: item.user_id?.full_name || null,
        headquarter_name: item.headquarter_name,
        working_town: item.working_town,
        route: item.route,
        date: item.check_in_time,
        start_time: startTime,
        end_time: endTime,
        total_km: item.check_out_km ? item.check_out_km - item.check_in_km : 0,
      };
    });

    res.json({ status: 200, attendance: result });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get active check-in data for checkout modal
// @route   GET /api/attendance/check-in-data
const getCheckInData = async (req, res) => {
  try {
    const userId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log("Getting check-in data for user:", userId, today, tomorrow);

    const attendance = await Attendance.findOne({
      user_id: userId,
      status: "checked_in",
      check_in_time: { $gte: today, $lt: tomorrow },
    }).populate("user_id", "full_name");

    if (!attendance) {
      return res.status(404).json({
        status: 404,
        message: "No active check-in found for today",
      });
    }

    const checkInTime = attendance.check_in_time
      ? attendance.check_in_time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
      : null;

    res.json({
      status: 200,
      checkInData: {
        _id: attendance._id,
        full_name: attendance.user_id?.full_name || null,
        check_in_time: checkInTime,
        check_in_km: attendance.check_in_km,
        check_in_image: attendance.check_in_image,
        selfie_image: attendance.selfie_image,
        headquarter_name: attendance.headquarter_name,
        working_town: attendance.working_town,
        route: attendance.route,
        stay_amount: attendance.stay_amount,
        stay_image: attendance.stay_image,
        food_amount: attendance.food_amount,
        food_image: attendance.food_image,
        other_amount: attendance.other_amount,
        other_image: attendance.other_image,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

module.exports = { checkIn, checkOut, getTodayAttendance, getAttendanceHistory, getCheckInData };
