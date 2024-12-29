const mongoose = require('mongoose');

const imageFormSchema = new mongoose.Schema({
    lawFirmDetails: {
        lawFirmName: {
            type: String,
            required: true,
        },
        operatingSince: {
            type: String,
            required: true,
        },
        yearsOfExperience: {
            type: String,
            required: true,
        },
        specialization: {
            type: String,
            required: true,
        },
        contactInfo: {
            email: {
                type: String,
                required: true,
                unique: true,
            },
            mobile: {
                type: String,
                required: true,
            },
            address: {
                line1: String,
                line2: String,
                city: String,
                state: String,
                postalCode: String,
            },
        },
    },
    professionalDetails: {
        lawyerType: {
            type: String,
            required: true,
        },
        caseDetails: {
            caseSolvedCount: {
                type: Number,
                required: true,
            },
            caseBasedBillRate: {
                type: String,
                required: true,
            },
            timeBasedBillRate: {
                type: String,
                required: true,
            },
            previousCases: [
                {
                    caseType: String,
                    caseDescription: String,
                },
            ],
        },
    },
    bankAccountDetails: {
        paymentMethod: {
            type: String,
            enum: ['Card', 'Bank', 'UPI'],
            required: true,
        },
        cardDetails: {
            cardNumber: String,
            expirationDate: String,
            cvv: String,
            saveCard: Boolean,
        },
        bankDetails: {
            accountNumber: String,
            bankName: String,
            ifscCode: String,
        },
        upiId: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
});

// Create unique index on email

module.exports = mongoose.model('ImageForm', imageFormSchema);
