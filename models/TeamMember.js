const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teamMemberSchema = new mongoose.Schema({
    personalDetails: {
        name: String,
        dateOfBirth: Date,
        gender: String,
        yearsOfExperience: Number,
        mobile: String,
        email: {
            type: String,
            required: true,
            unique: true // Ensures email is unique for each team member
        },
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
    password: {
        type: String,
        required: true,
        select: false // Prevents password from being returned in queries by default
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

// Hash password before saving
teamMemberSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

module.exports = mongoose.model('TeamMember', teamMemberSchema);
