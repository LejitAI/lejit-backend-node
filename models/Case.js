// models/Case.js
const mongoose = require('mongoose');

const CaseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    startingDate: {
        type: Date,
        required: true,
    },
    caseType: {
        type: String,
        required: true,
    },
    client: {
        type: String,
        required: true,
    },
    oppositeClient: {
        type: String,
    },
    caseWitness: {
        type: String,
    },
    caseDescription: {
        type: String,
    },
    documents: [{
        type: String,
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Case', CaseSchema);
