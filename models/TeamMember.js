const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
    personalDetails: {
        name: String,
        dateOfBirth: Date,
        gender: String,
        yearsOfExperience: Number,
        mobile: String,
        email: String,
        address: {
            line1: String,
            line2: String,
            city: String,
            state: String,
            country: String,
            postalCode: String,
        },
    },
    professionalDetails: {
        lawyerType: String,
        governmentID: String,
        degreeType: String,
        degreeInstitution: String,
        specialization: String,
    },
    bankAccountDetails: {
        paymentMethod: String, // Card, Bank, or UPI
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
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to admin who added the member
});

module.exports = mongoose.model('TeamMember', teamMemberSchema);
