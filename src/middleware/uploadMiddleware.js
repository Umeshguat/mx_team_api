const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  }
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Wrapper that catches multer errors and sends JSON response
const uploadFields = (fields) => {
  return (req, res, next) => {
    const multerUpload = multerInstance.fields(fields);
    multerUpload(req, res, (err) => {
      if (err) {
        console.log("Multer error:", err);
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ status: 400, message: "File size exceeds 5MB limit" });
          }
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ status: 400, message: "Only image files are allowed" });
          }
          return res.status(400).json({ status: 400, message: err.message });
        }
        return res.status(400).json({ status: 400, message: err.message });
      }
      next();
    });
  };
};

module.exports = { uploadFields };
