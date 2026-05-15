const mongoose = require('mongoose');

/**
 * A Notification record is created whenever an admin takes an action
 * that an employee needs to know about.  Each record targets a single
 * employee and tracks whether they have read it.
 */
const NotificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true,
        },
        // Reference to the triggering assignment (nullable for payroll/overtime)
        assignmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'assignment',
            default: null,
        },
        type: {
            type: String,
            // new_assignment | schedule_update | working_hours_update | payroll_update | overtime_flag
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        detail: {
            type: String,
            default: '',
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('notification', NotificationSchema);
