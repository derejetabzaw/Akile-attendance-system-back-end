const express = require('express');
const router = express.Router();
const moment = require('moment');
const verifyJWT = require('../middlewares/verifyJWT');

const Leave = require('../models/Leave');
const User = require('../models/User');
const Notification = require('../models/Notification');

// ─────────────────────────────────────────────
// @route   POST /api/v1/leave
// @desc    Employee submits a leave request
// @access  Private
// ─────────────────────────────────────────────
router.post('/', verifyJWT, async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;

        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({ msg: 'All fields are required.' });
        }

        const start = moment(startDate, 'YYYY-MM-DD');
        const end = moment(endDate, 'YYYY-MM-DD');

        if (!start.isValid() || !end.isValid()) {
            return res.status(400).json({ msg: 'Invalid date format. Use YYYY-MM-DD.' });
        }

        if (end.isBefore(start)) {
            return res.status(400).json({ msg: 'End date must be on or after start date.' });
        }

        // Count business days (inclusive)
        const numberOfDays = end.diff(start, 'days') + 1;

        const leave = new Leave({
            user: req.user.id,
            leaveType,
            startDate,
            endDate,
            numberOfDays,
            reason,
        });

        await leave.save();

        return res.status(201).json({ msg: 'Leave request submitted successfully.', leave });
    } catch (error) {
        console.error('Leave POST error:', error.message);
        return res.status(500).json({ msg: 'Server error.' });
    }
});

// ─────────────────────────────────────────────
// @route   GET /api/v1/leave/my
// @desc    Employee gets their own leave requests
// @access  Private
// ─────────────────────────────────────────────
router.get('/my', verifyJWT, async (req, res) => {
    try {
        const leaves = await Leave.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        return res.status(200).json({ leaves });
    } catch (error) {
        console.error('Leave GET /my error:', error.message);
        return res.status(500).json({ msg: 'Server error.' });
    }
});

// ─────────────────────────────────────────────
// @route   GET /api/v1/leave
// @desc    Admin gets ALL leave requests (with optional status filter)
// @access  Private (Admin only)
// ─────────────────────────────────────────────
router.get('/', verifyJWT, async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.status = status;
        }

        const leaves = await Leave.find(filter)
            .populate('user', 'name lastName staffId position workingSite')
            .sort({ createdAt: -1 });

        return res.status(200).json({ leaves });
    } catch (error) {
        console.error('Leave GET / error:', error.message);
        return res.status(500).json({ msg: 'Server error.' });
    }
});

// ─────────────────────────────────────────────
// @route   GET /api/v1/leave/stats
// @desc    Admin gets leave summary stats
// @access  Private (Admin)
// ─────────────────────────────────────────────
router.get('/stats', verifyJWT, async (req, res) => {
    try {
        const [pending, approved, rejected, total] = await Promise.all([
            Leave.countDocuments({ status: 'pending' }),
            Leave.countDocuments({ status: 'approved' }),
            Leave.countDocuments({ status: 'rejected' }),
            Leave.countDocuments({}),
        ]);

        return res.status(200).json({ total, pending, approved, rejected });
    } catch (error) {
        console.error('Leave stats error:', error.message);
        return res.status(500).json({ msg: 'Server error.' });
    }
});

// ─────────────────────────────────────────────
// @route   PUT /api/v1/leave/:id/status
// @desc    Admin approves or rejects a leave request
// @access  Private (Admin)
// ─────────────────────────────────────────────
router.put('/:id/status', verifyJWT, async (req, res) => {
    try {
        const { status, adminNote } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ msg: 'Status must be "approved" or "rejected".' });
        }

        const leave = await Leave.findById(req.params.id);
        if (!leave) {
            return res.status(404).json({ msg: 'Leave request not found.' });
        }

        leave.status = status;
        leave.adminNote = adminNote || '';
        await leave.save();

        await Notification.create({
            userId: leave.user,
            type: 'leave_update',
            title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Your leave request has been ${status}.`,
            detail: adminNote || '',
        });

        return res.status(200).json({ msg: `Leave request ${status}.`, leave });
    } catch (error) {
        console.error('Leave PUT status error:', error.message);
        return res.status(500).json({ msg: 'Server error.' });
    }
});

// ─────────────────────────────────────────────
// @route   DELETE /api/v1/leave/:id
// @desc    Employee cancels a pending leave request
// @access  Private
// ─────────────────────────────────────────────
router.delete('/:id', verifyJWT, async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);

        if (!leave) {
            return res.status(404).json({ msg: 'Leave request not found.' });
        }

        if (leave.user.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized.' });
        }

        if (leave.status !== 'pending') {
            return res.status(400).json({ msg: 'Only pending requests can be cancelled.' });
        }

        await leave.deleteOne();

        return res.status(200).json({ msg: 'Leave request cancelled.' });
    } catch (error) {
        console.error('Leave DELETE error:', error.message);
        return res.status(500).json({ msg: 'Server error.' });
    }
});

module.exports = router;
