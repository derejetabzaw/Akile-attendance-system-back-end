const mongoose = require('mongoose');

const AllowanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    monthIdentifier: {
        type: String,
        required: true
    },
    transportAllowance: {
        type: Number,
        default: 0
    },
    salaryAdvance: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('allowance', AllowanceSchema);
