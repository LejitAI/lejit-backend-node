const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    role: { 
        type: String, 
        enum: ['citizen', 'law_firm', 'corporate'], 
        required: true 
    },
    username: { type: String, required: true }, // Common for all
    email: { type: String, required: true, unique: true }, // Common for all
    password: { type: String, required: true }, // Common for all
    company_name: { type: String }, // Required for corporate
    law_firm_name: { type: String }, // Required for law firm
    validated: { type: Boolean, default: true }, // Admin validation for all users
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
