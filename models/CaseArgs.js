const mongoose = require('mongoose');

const caseArgsSchema = new mongoose.Schema({
    caseId: String,
    arguments: Array
});


module.exports = mongoose.model('CaseArgs', caseArgsSchema);

