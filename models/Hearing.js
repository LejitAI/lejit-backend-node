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
        required: true,
        validate: {
            validator: function(v) {
                // Validate time format (HH:mm)
                return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: props => `${props.value} is not a valid time format! Use HH:mm`
        }
    },
    duration: {
        type: Number, // Duration in minutes
        default: 60
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
        type: String,
        maxLength: 1000
    },
    status: {
        type: String,
        enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed', 'Rescheduled'],
        default: 'Scheduled'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
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
        name: String,
        contact: String,
        courtroom: String
    },
    courtRoom: {
        name: String,
        number: String,
        floor: String,
        building: String
    },
    opposingParty: {
        name: String,
        lawyer: String,
        contact: String,
        email: String
    },
    witnesses: [{
        name: String,
        contact: String,
        email: String,
        type: {
            type: String,
            enum: ['Expert', 'Eye Witness', 'Character Witness', 'Other']
        },
        status: {
            type: String,
            enum: ['Confirmed', 'Pending', 'Cancelled'],
            default: 'Pending'
        }
    }],
    documents: [{
        title: String,
        fileUrl: String,
        type: {
            type: String,
            enum: ['Evidence', 'Testimony', 'Legal Document', 'Other']
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    reminders: [{
        reminderDate: Date,
        reminderType: {
            type: String,
            enum: ['Email', 'SMS', 'System Notification'],
            default: 'Email'
        },
        sent: {
            type: Boolean,
            default: false
        },
        message: String
    }],
    recurringPattern: {
        type: {
            type: String,
            enum: ['None', 'Daily', 'Weekly', 'Monthly'],
            default: 'None'
        },
        interval: Number, // e.g., every 2 weeks
        endDate: Date
    }
});

// Existing timestamps and indexes...

// Enhanced virtual for formatted date and time
hearingSchema.virtual('formattedDateTime').get(function() {
    return {
        date: this.date.toLocaleDateString(),
        time: this.time,
        fullDateTime: `${this.date.toLocaleDateString()} ${this.time}`
    };
});

// Virtual for hearing duration end time
hearingSchema.virtual('endTime').get(function() {
    const [hours, minutes] = this.time.split(':').map(Number);
    const endDate = new Date(this.date);
    endDate.setHours(hours, minutes + (this.duration || 60));
    return endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

// Method to check for scheduling conflicts
hearingSchema.methods.hasConflict = async function() {
    const startTime = new Date(`${this.date.toDateString()} ${this.time}`);
    const endTime = new Date(startTime.getTime() + (this.duration || 60) * 60000);

    const conflicts = await this.constructor.find({
        _id: { $ne: this._id },
        createdBy: this.createdBy,
        date: this.date,
        $or: [
            {
                time: {
                    $gte: this.time,
                    $lt: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            },
            {
                endTime: {
                    $gt: this.time,
                    $lte: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            }
        ]
    });

    return conflicts.length > 0;
};

// Existing methods...

const Hearing = mongoose.model('Hearing', hearingSchema);

module.exports = Hearing;
