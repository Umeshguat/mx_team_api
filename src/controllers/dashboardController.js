const User = require("../models/userModel");
const Attendance = require("../models/attendanceModel");
const VendorVisit = require("../models/vendorVisitModel");

// @desc    Get admin dashboard data
// @route   GET /api/dashboard
const getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total employees
    const totalEmployees = await User.countDocuments();

    // Present today (distinct users who checked in today)
    const presentToday = await Attendance.distinct("user_id", {
      check_in_time: { $gte: today, $lt: tomorrow },
    });
    const presentCount = presentToday.length;

    // Absent / Leave
    const absentCount = totalEmployees - presentCount;

    // Vendor visits today
    const vendorVisitsToday = await VendorVisit.countDocuments({
      visit_date: { $gte: today, $lt: tomorrow },
    });

    // Total daily allowance (sum of stay + food + other amounts for today)
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

    // Get logged-in user's today check-in/check-out data
    const userAttendance = await Attendance.findOne({
      user_id: req.user._id,
      check_in_time: { $gte: today, $lt: tomorrow },
    }).sort({ check_in_time: -1 });

    let checkInTime = null;
    let checkOutTime = null;
    let hours = "0h 0m";
    let status = "Not Checked In";

    if (userAttendance) {
      checkInTime = userAttendance.check_in_time
        ? userAttendance.check_in_time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
        : null;
      checkOutTime = userAttendance.check_out_time
        ? userAttendance.check_out_time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
        : null;
      status = userAttendance.status === "checked_out" ? "Checked Out" : "Checked In";

      if (userAttendance.check_in_time && userAttendance.check_out_time) {
        const diff = userAttendance.check_out_time - userAttendance.check_in_time;
        const totalMinutes = Math.floor(diff / 60000);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        hours = `${h}h ${m}m`;
      }
    }

    res.json({
      status: 200,
      data: {
        total_employees: totalEmployees,
        present_today: presentCount,
        absent_leave: absentCount,
        vendor_visits: vendorVisitsToday,
        total_daily_allowance: totalDailyAllowance,
        my_attendance: {
          status,
          check_in: checkInTime,
          check_out: checkOutTime,
          hours,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

module.exports = { getDashboard };
