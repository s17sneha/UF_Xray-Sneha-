const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["url", "file"], required: true },
  target: { type: String, required: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Report", ReportSchema);
