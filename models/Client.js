const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    profilePhoto: { type: String }, // URL or path to the profile photo
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const Client = mongoose.model('Client', clientSchema);
module.exports = Client;
