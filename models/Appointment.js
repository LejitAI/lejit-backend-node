const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", required: true },
  lawFirmId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true }, // e.g., "3:00 PM"
  caseNotes: { type: String },
  status: { type: String, enum: ["Pending", "Confirmed", "Rejected"], default: "Pending" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Appointment", appointmentSchema);
