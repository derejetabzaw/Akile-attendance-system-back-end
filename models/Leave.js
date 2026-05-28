const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
        leaveType: {
            type: String,
            enum: ['annual', 'sick', 'emergency', 'unpaid'],
            required: true,
        },
        startDate: {
            type: String, // "YYYY-MM-DD"
            required: true,
        },
        endDate: {
            type: String, // "YYYY-MM-DD"
            required: true,
        },
        numberOfDays: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        adminNote: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('leave', LeaveSchema);
