const mongoose = require('mongoose');

const hearingSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    caseType: {
        type: String,
        required: true,
        enum: ['Criminal', 'Civil', 'Corporate', 'Family']
    },
    location: {
        type: String,
        required: true
    },
    notes: {
        type: String
    },
    status: {
        type: String,
        enum: ['Scheduled', 'Completed', 'Cancelled', 'Postponed'],
        default: 'Scheduled'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    judge: {
        type: String
    },
    courtRoom: {
        type: String
    },
    opposingParty: {
        name: String,
        lawyer: String,
        contact: String
    },
    witnesses: [{
        name: String,
        contact: String,
        type: String // e.g., 'Expert', 'Eye Witness', etc.
    }],
    documents: [{
        title: String,
        fileUrl: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    reminders: [{
        reminderDate: Date,
        reminderType: String, // e.g., 'Email', 'SMS', etc.
        sent: {
            type: Boolean,
            default: false
        }
    }]
});

// Add timestamps for updatedAt
hearingSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Index for efficient queries
hearingSchema.index({ date: 1, createdBy: 1 });
hearingSchema.index({ caseId: 1 });
hearingSchema.index({ client: 1 });

// Virtual for formatted date and time
hearingSchema.virtual('formattedDateTime').get(function() {
    return `${new Date(this.date).toLocaleDateString()} ${this.time}`;
});

// Method to check if hearing is upcoming
hearingSchema.methods.isUpcoming = function() {
    const hearingDate = new Date(`${this.date.toDateString()} ${this.time}`);
    return hearingDate > new Date();
};

// Static method to find upcoming hearings
hearingSchema.statics.findUpcoming = function(userId) {
    return this.find({
        createdBy: userId,
        date: { $gte: new Date() },
        status: 'Scheduled'
    }).sort({ date: 1, time: 1 });
};

const Hearing = mongoose.model('Hearing', hearingSchema);

module.exports = Hearing;
