const User = require("../models/userModel");
const Attendance = require("../models/attendanceModel");
const VendorVisit = require("../models/vendorVisitModel");

// Helper: get today's date range
const getTodayRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
};

// Helper: format attendance record
const formatAttendanceRecord = (item) => {
  const checkInTime = item.check_in_time
    ? item.check_in_time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : null;
  const checkOutTime = item.check_out_time
    ? item.check_out_time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : null;

  let hours = "0h 0m";
  if (item.check_in_time && item.check_out_time) {
    const diff = item.check_out_time - item.check_in_time;
    const totalMinutes = Math.floor(diff / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    hours = `${h}h ${m}m`;
  }

  return {
    _id: item._id,
    user_id: item.user_id?._id || item.user_id,
    full_name: item.user_id?.full_name || null,
    email: item.user_id?.email || null,
    headquarter_name: item.headquarter_name,
    working_town: item.working_town,
    route: item.route,
    date: item.check_in_time,
    check_in_time: checkInTime,
    check_out_time: checkOutTime,
    check_in_km: item.check_in_km,
    check_out_km: item.check_out_km,
    total_km: item.check_out_km ? item.check_out_km - item.check_in_km : 0,
    hours,
    status: item.status === "checked_out" ? "Checked Out" : "Checked In",
    check_in_image: item.check_in_image,
    selfie_image: item.selfie_image,
    check_out_image: item.check_out_image,
  };
};

// @desc    Get dashboard data (single API for both Admin & Employee)
// @route   GET /api/dashboard
const getDashboard = async (req, res) => {
  try {
    const { today, tomorrow } = getTodayRange();
    const userId = req.user._id;

    // Detect if user is admin
    const user = await User.findById(userId).populate("role_id");
    const isAdmin = user && user.role_id && user.role_id.role_name === "Admin";

    // --- Common: logged-in user's own today attendance ---
    const myAttendanceDoc = await Attendance.findOne({
      user_id: userId,
      check_in_time: { $gte: today, $lt: tomorrow },
    })
      .populate("user_id", "full_name email headquarter_name")
      .sort({ check_in_time: -1 });

    const myAttendance = myAttendanceDoc
      ? formatAttendanceRecord(myAttendanceDoc)
      : null;

    // true if checked in today but not yet checked out
    const check_in =
      myAttendanceDoc !== null &&
      myAttendanceDoc.status === "checked_in";

    const myStatus = myAttendance ? myAttendance.status : "Not Checked In";

    if (isAdmin) {
      // ---- ADMIN DASHBOARD ----
      const totalEmployees = await User.countDocuments();

      const presentToday = await Attendance.distinct("user_id", {
        check_in_time: { $gte: today, $lt: tomorrow },
      });
      const presentCount = presentToday.length;
      const absentCount = totalEmployees - presentCount;

      const vendorVisitsToday = await VendorVisit.countDocuments({
        visit_date: { $gte: today, $lt: tomorrow },
      });

      const allowanceResult = await Attendance.aggregate([
        {
          $match: {
            check_in_time: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: null,
            total_stay: { $sum: "$stay_amount" },
            total_food: { $sum: "$food_amount" },
            total_other: { $sum: "$other_amount" },
          },
        },
      ]);

      const totalDailyAllowance =
        allowanceResult.length > 0
          ? allowanceResult[0].total_stay +
            allowanceResult[0].total_food +
            allowanceResult[0].total_other
          : 0;

      // All employees' today check-in data
      const todayAttendances = await Attendance.find({
        check_in_time: { $gte: today, $lt: tomorrow },
      })
        .populate("user_id", "full_name email headquarter_name")
        .sort({ check_in_time: -1 });

      const employeesCheckIn = todayAttendances.map(formatAttendanceRecord);

      return res.json({
        status: 200,
        role: "Admin",
        data: {
          check_in,
          total_employees: totalEmployees,
          present_today: presentCount,
          absent_leave: absentCount,
          vendor_visits: vendorVisitsToday,
          total_daily_allowance: totalDailyAllowance,
          my_attendance: myAttendance,
          employees_check_in: employeesCheckIn,
        },
      });
    }

    // ---- EMPLOYEE DASHBOARD ----
    const vendorVisitsToday = await VendorVisit.countDocuments({
      user_id: userId,
      visit_date: { $gte: today, $lt: tomorrow },
    });

    const allowanceResult = await Attendance.aggregate([
      {
        $match: {
          user_id: userId,
          check_in_time: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          total_stay: { $sum: "$stay_amount" },
          total_food: { $sum: "$food_amount" },
          total_other: { $sum: "$other_amount" },
        },
      },
    ]);

    const totalDailyAllowance =
      allowanceResult.length > 0
        ? allowanceResult[0].total_stay +
          allowanceResult[0].total_food +
          allowanceResult[0].total_other
        : 0;

    // Last 7 days history
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentAttendances = await Attendance.find({
      user_id: userId,
      check_in_time: { $gte: sevenDaysAgo },
    })
      .populate("user_id", "full_name email headquarter_name")
      .sort({ check_in_time: -1 });

    const recentHistory = recentAttendances.map(formatAttendanceRecord);

    return res.json({
      status: 200,
      role: "Employee",
      data: {
        check_in,
        status: myStatus,
        my_attendance: myAttendance,
        vendor_visits_today: vendorVisitsToday,
        total_daily_allowance: totalDailyAllowance,
        recent_history: recentHistory,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

module.exports = { getDashboard };
