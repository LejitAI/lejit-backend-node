const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    chatgptApiKey: { type: String, required: false },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Settings', SettingsSchema);
