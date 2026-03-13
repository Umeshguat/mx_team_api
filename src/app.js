const express = require("express");
const cors = require("cors");
const path = require("path");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Salesmen API is running" });
});

module.exports = app;
