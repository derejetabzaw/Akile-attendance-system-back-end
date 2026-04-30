const express = require('express');
const router = express.Router();
const moment = require('moment');
const verifyJWT = require('../middlewares/verifyJWT');

const User = require('../models/User');
const Attendance = require('../models/Attendance');

// @route    GET /api/v1/notifications
// @desc     Return dynamic notifications derived from real system events
// @access   Private
router.get(
    '/',
    verifyJWT,
    async (req, res) => {
        try {
            const notifications = [];
            const today = moment().format("YYYY-MM-DD");

            // 1. Pending approval users (registered via app, not yet approved)
            const pendingUsers = await User.find({ registeredViaApp: true, isApproved: false })
                .select('name lastName email createdAt')
                .sort({ _id: -1 })
                .limit(10);

            pendingUsers.forEach(user => {
                notifications.push({
                    id: 'pending_' + user._id,
                    type: 'pending_approval',
                    icon: 'cil-user-follow',
                    color: 'warning',
                    message: `${user.name} ${user.lastName || ''} is awaiting approval`,
                    detail: user.email || 'No email',
                    timestamp: user._id.getTimestamp(),
                    actionUrl: '/users/pending'
                });
            });

            // 2. Today's check-ins
            const todayCheckins = await Attendance.find({ date: today })
                .populate('user', 'name lastName staffId')
                .sort({ checkInTime: -1 })
                .limit(10);

            todayCheckins.forEach(record => {
                if (record.user) {
                    if (record.checkOutTime && record.checkOutTime !== '') {
                        notifications.push({
                            id: 'checkout_' + record._id,
                            type: 'checkout',
                            icon: 'cil-account-logout',
                            color: 'info',
                            message: `${record.user.name} ${record.user.lastName || ''} checked out`,
                            detail: `at ${record.checkOutTime}`,
                            timestamp: new Date(today + 'T' + record.checkOutTime),
                            actionUrl: '/dashboard'
                        });
                    } else {
                        notifications.push({
                            id: 'checkin_' + record._id,
                            type: 'checkin',
                            icon: 'cil-check-circle',
                            color: 'success',
                            message: `${record.user.name} ${record.user.lastName || ''} checked in`,
                            detail: `at ${record.checkInTime}`,
                            timestamp: new Date(today + 'T' + record.checkInTime),
                            actionUrl: '/dashboard'
                        });
                    }
                }
            });

            // 3. Recently approved users (approved in the last 7 days)
            const sevenDaysAgo = moment().subtract(7, 'days').toDate();
            const recentlyApproved = await User.find({
                isApproved: true,
                registeredViaApp: true,
                _id: { $gte: require('mongoose').Types.ObjectId.createFromTime(Math.floor(sevenDaysAgo.getTime() / 1000)) }
            })
                .select('name lastName staffId')
                .sort({ _id: -1 })
                .limit(5);

            recentlyApproved.forEach(user => {
                notifications.push({
                    id: 'approved_' + user._id,
                    type: 'approved',
                    icon: 'cil-check-alt',
                    color: 'success',
                    message: `${user.name} ${user.lastName || ''} was activated`,
                    detail: `Staff ID: ${user.staffId}`,
                    timestamp: user._id.getTimestamp(),
                    actionUrl: '/dashboard'
                });
            });

            // 4. Total employee count for stats
            const totalEmployees = await User.countDocuments({ isApproved: true });
            const totalPending = pendingUsers.length;
            const todayAttendanceCount = await Attendance.countDocuments({ date: today });

            // Sort all notifications by timestamp (most recent first)
            notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return res.status(200).json({
                notifications: notifications.slice(0, 20),
                summary: {
                    totalPending,
                    totalEmployees,
                    todayAttendanceCount
                }
            });
        } catch (error) {
            console.log("Notifications error:", error.message);
            return res.status(500).json({ msg: "Server Error occured" });
        }
    }
);

module.exports = router;
