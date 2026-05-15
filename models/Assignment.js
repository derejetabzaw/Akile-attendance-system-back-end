const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['task', 'shift', 'schedule', 'site'],
            required: true,
        },
        site: {
            type: String,
            default: '',
        },
        shiftStart: {
            type: String,  // "HH:mm"
            default: '',
        },
        shiftEnd: {
            type: String,  // "HH:mm"
            default: '',
        },
        scheduledDate: {
            type: String,  // "YYYY-MM-DD"
            default: '',
        },
        workingHours: {
            type: Number,
            default: 0,
        },
        notes: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['pending', 'active', 'completed'],
            default: 'pending',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('assignment', AssignmentSchema);
