const mongoose = require('mongoose');

const hearingSchema = new mongoose.Schema({
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    duration: { type: Number, default: 60 },
    location: { type: String, required: true },
    judge: { name: String, contact: String, courtroom: String },
    courtRoom: { name: String, number: String, floor: String, building: String },
    opposingParty: { name: String, lawyer: String, contact: String, email: String },
    witnesses: [{ name: String, contact: String, type: String, status: String }],
    documents: [{ title: String, fileUrl: String, type: String, uploadedAt: Date }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Add virtual `endTime` field
hearingSchema.virtual('endTime').get(function () {
    const [hours, minutes] = this.time.split(':').map(Number);
    const endDate = new Date(this.date);
    endDate.setHours(hours, minutes + (this.duration || 60));
    return endDate.toISOString();
});

const Hearing = mongoose.model('Hearing', hearingSchema);

module.exports = Hearing;
